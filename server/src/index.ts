import express from "express";
import { WsInputMessage } from "../../shared/types";
import ConfigFile from "./config_file";
import Chats from "./db/models/chats";
import Dashboards, { Dashboard, dbToDto } from "./db/models/dashboards";
import { startWsServer } from "./framework/wsst";
import { log } from "./utils";
import { AnthropicChat } from "./vendors/anthropic";
import { OpenAiChat } from "./vendors/openai";
import msgs from "./msgs";

const DEFAULT_SYSTEM =
  "You are a helpful assistant. You answer concisely and to the point.";

const PORT = process.env.PORT || 3000;

async function main() {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // allow CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Health check
  app.get("/", (_req, res) => {
    res.json({ status: "OK" });
  });

  app.get("/api/profiles", async (_req, res) => {
    try {
      const profiles = Object.keys(config?.profiles || {}).map((name) => ({
        name,
        vendor: config?.profiles[name].vendor,
        model: config?.profiles[name].model,
      }));
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/dashboards", async (_req, res) => {
    try {
      const dbs = await Dashboards.all();
      res.json(dbs.map(dbToDto));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.post("/api/dashboards", async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const db = await Dashboards.create(name);
      res.json(dbToDto(db));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });

  app.get("/api/dashboards/:id", async (req, res) => {
    const id = req.params.id;

    let db: Dashboard | null = null;

    try {
      db = await Dashboards.findByUuid(id);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!db) {
      res.status(404).json({ error: "Dashboard not found" });
      return;
    }

    res.json(dbToDto(db));
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  const chats: Record<
    string,
    { profile: string; messages: []; chat: OpenAiChat | AnthropicChat }
  > = {};

  startWsServer<WsInputMessage>({ server })
    .on("START_CHAT", async (payload, { sendMsg }) => {
      const p = config?.profiles[payload.profile];

      if (!p) {
        log("Error: Profile not found", { profile: payload.profile });
        return;
      }

      const db = await Dashboards.findByUuid(payload.dbUuid);

      if (!db) {
        log("Error: Dashboard not found", { dbUuid: payload.dbUuid });
        sendMsg(msgs.generalError("Dashboard not found"));
        return;
      }

      const c = await Chats.create("New Chat", db.id, payload.profile);
      const ChatEngine = p.vendor === "openai" ? OpenAiChat : AnthropicChat;

      const chat = new ChatEngine(
        p.vendor === "openai" ? config.openai_key : config.anthropic_key,
        p.model,
        p.system ?? DEFAULT_SYSTEM
      );

      chats[c.uuid] = {
        profile: payload.profile,
        messages: [],
        chat,
      };

      chat.onPartialReply((msg) => {
        sendMsg(msgs.partialReply(c.uuid, msg));
      });

      chat.onReplyFinish(() => {
        sendMsg(msgs.replyFinish(c.uuid));
      });

      chat.onError((err) => {
        sendMsg(msgs.chatError(c.uuid, err));
      });

      log("Chat started", { uuid: c.uuid, profile: payload.profile });
      sendMsg(msgs.chatStarted(c.uuid, payload.profile));
      return;
    })
    .on("POST_MESSAGE", async (payload) => {
      const c = chats[payload.chatId];

      if (!c) {
        log("Error: Chat not found", { chatId: payload.chatId });
        return;
      }

      c.chat.postMessage(payload.content, payload.image);
      return;
    })
    .on("DELETE_CHAT", async (payload) => {
      const c = chats[payload.chatId];

      if (!c) {
        log("Error: Chat not found", { chatId: payload.chatId });
        return;
      }

      delete chats[payload.chatId];
      // TODO: c.chat.destroy(); ?
      return;
    });

  // TODO: how to handle this?
  //       log("Error: Received message is not a valid type", { data });
  //       return;
}

main();
