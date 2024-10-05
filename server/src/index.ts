import express from "express";
import { v4 } from "uuid";
import { WsInputMessage, WsOutputMessage } from "../../shared/types";
import ConfigFile from "./config_file";
import { startWsServer } from "./framework/wsst";
import { log } from "./utils";
import { AnthropicChat } from "./vendors/anthropic";
import { OpenAiChat } from "./vendors/openai";

const DEFAULT_SYSTEM =
  "You are a helpful assistant. You answer concisely and to the point.";

const PORT = process.env.PORT || 3000;

async function main() {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  const app = express();

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

      const id = v4();

      const Chat = p.vendor === "openai" ? OpenAiChat : AnthropicChat;

      const chat = new Chat(
        p.vendor === "openai" ? config.openai_key : config.anthropic_key,
        p.model,
        p.system ?? DEFAULT_SYSTEM
      );

      chats[id] = {
        profile: payload.profile,
        messages: [],
        chat,
      };

      chat.onPartialReply((msg) => {
        sendMsg(partialReply(id, msg));
      });

      chat.onReplyFinish(() => {
        sendMsg(replyFinish(id));
      });

      chat.onError((err) => {
        sendMsg(chatError(id, err));
      });

      log("Chat started", { id, profile: payload.profile });
      sendMsg(chatStarted(id, payload.profile));
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

// message helpers

function partialReply(id: string, content: string): WsOutputMessage {
  return {
    type: "CHAT_PARTIAL_REPLY",
    payload: {
      chatId: id,
      content,
    },
  };
}

function replyFinish(id: string): WsOutputMessage {
  return {
    type: "CHAT_REPLY_FINISH",
    payload: {
      chatId: id,
    },
  };
}

function chatError(id: string, error: string): WsOutputMessage {
  return {
    type: "CHAT_ERROR",
    payload: {
      chatId: id,
      error,
    },
  };
}

function chatStarted(id: string, profile: string): WsOutputMessage {
  return {
    type: "CHAT_STARTED",
    payload: {
      name: profile,
      id,
    },
  };
}
