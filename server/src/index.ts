import express from "express";
import { WsInputMessage, WsOutputMessage } from "../../shared/types";
import ConfigFile from "./config_file";
import Chats, { chatDto } from "./db/models/chats";
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

  app.get("/api/dashboards/:id/chats", async (req, res) => {
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

    const chats = await Chats.allByDashboard(db.id);

    res.json(chats.map(chatDto));
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  const chats: Record<
    string,
    { profile: string; messages: []; chat: OpenAiChat | AnthropicChat }
  > = {};

  // Tries to get the chat engine from the memory,
  // if not found, tries to load the chat from the database
  // and then creates an instance of the chat engine in memory
  const safeGetChatEngine = async (
    uuid: string,
    sendMsg: (m: WsOutputMessage) => void
  ) => {
    const e = chats[uuid];

    if (e) {
      return e.chat;
    }

    if (!e) {
      // trying to load from the database
      const chat = await Chats.findByUuid(uuid);

      // TODO: do we need to check the dashboard?
      if (!chat) {
        return null;
      }

      const chatEngine = initiateChat(chat.uuid, chat.profile_name, sendMsg);
      return chatEngine;
    }
  };

  // Creates an instance of the chat engine in memory
  const initiateChat = (
    uuid: string,
    profile: string,
    sendMsg: (m: WsOutputMessage) => void
  ) => {
    const p = config?.profiles[profile];
    if (!p) {
      log("Error: Profile not found", { profile });
      return null;
    }
    const ChatEngine = p.vendor === "openai" ? OpenAiChat : AnthropicChat;

    const chatEngine = new ChatEngine(
      p.vendor === "openai" ? config.openai_key : config.anthropic_key,
      p.model,
      p.system ?? DEFAULT_SYSTEM
    );

    chats[uuid] = {
      profile: profile,
      messages: [],
      chat: chatEngine,
    };

    chatEngine.onPartialReply((msg) => {
      sendMsg(msgs.partialReply(uuid, msg));
    });

    chatEngine.onReplyFinish(() => {
      sendMsg(msgs.replyFinish(uuid));
    });

    chatEngine.onError((err) => {
      sendMsg(msgs.chatError(uuid, err));
    });

    return chatEngine;
  };

  startWsServer<WsInputMessage>({ server })
    .on("START_CHAT", async (payload, { sendMsg }) => {
      const db = await Dashboards.findByUuid(payload.dbUuid);

      if (!db) {
        log("Error: Dashboard not found", { dbUuid: payload.dbUuid });
        sendMsg(msgs.generalError("Dashboard not found"));
        return;
      }

      const chat = await Chats.create("New Chat", db.id, payload.profile);

      const chatEngine = initiateChat(chat.uuid, payload.profile, sendMsg);

      if (!chatEngine) {
        return;
      }

      log("Chat started", { uuid: chat.uuid, profile: payload.profile });
      sendMsg(msgs.chatStarted(chatDto(chat)));
      return;
    })
    .on("POST_MESSAGE", async (payload, { sendMsg }) => {
      const engine = await safeGetChatEngine(payload.chatId, sendMsg);

      if (!engine) {
        log("Error: Chat not found", { chatId: payload.chatId });
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      engine.postMessage(payload.content, payload.image);
      return;
    })
    .on("DELETE_CHAT", async (payload, { sendMsg }) => {
      const c = await safeGetChatEngine(payload.chatId, sendMsg);

      if (!c) {
        log("Error: Chat not found", { chatId: payload.chatId });
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      delete chats[payload.chatId];
      // TODO delete chat from the database
      // TODO: c.chat.destroy(); ?
      return;
    });

  // TODO: how to handle this?
  //       log("Error: Received message is not a valid type", { data });
  //       return;
}

main();
