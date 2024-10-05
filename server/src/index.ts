import express from "express";
import ws from "ws";
import ConfigFile from "./config_file";
import { WsInputMessage, WsOutputMessage } from "../../shared/types";
import { v4 } from "uuid";
import { OpenAiChat } from "./vendors/openai";
import { AnthropicChat } from "./vendors/anthropic";

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

  // Set up WebSocket server
  const wsServer = new ws.Server({ server });

  wsServer.on("connection", (ws) => {
    log("New connection");

    const handlePartialReply = (msg: string, id: string) => {
      const msgObj: WsOutputMessage = {
        type: "CHAT_PARTIAL_REPLY",
        payload: {
          chatId: id,
          content: msg,
        },
      };
      ws.send(JSON.stringify(msgObj));
    };

    const handleReplyFinish = (id: string) => {
      const msg: WsOutputMessage = {
        type: "CHAT_REPLY_FINISH",
        payload: {
          chatId: id,
        },
      };
      ws.send(JSON.stringify(msg));
    };

    const handleChatError = (id: string, error: string) => {
      const msg: WsOutputMessage = {
        type: "CHAT_ERROR",
        payload: {
          chatId: id,
          error,
        },
      };
      ws.send(JSON.stringify(msg));
    };

    ws.on("message", (message) => {
      const messageStr = asString(message);

      if (messageStr === null) {
        return;
      }

      const data = JSON.parse(messageStr) as WsInputMessage;

      if (data.type === "START_CHAT") {
        const p = config?.profiles[data.payload.profile];

        if (!p) {
          log("Error: Profile not found", { profile: data.payload.profile });
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
          profile: data.payload.profile,
          messages: [],
          chat,
        };

        chat.onPartialReply((m) => handlePartialReply(m, id));
        chat.onReplyFinish(() => handleReplyFinish(id));
        chat.onError((err) => handleChatError(id, err));

        const msg: WsOutputMessage = {
          type: "CHAT_STARTED",

          payload: {
            name: data.payload.profile,
            id,
          },
        };

        log("Chat started", { id, profile: data.payload.profile });
        ws.send(JSON.stringify(msg));
        return;
      } else if (data.type === "POST_MESSAGE") {
        const c = chats[data.payload.chatId];

        if (!c) {
          log("Error: Chat not found", { chatId: data.payload.chatId });
          return;
        }

        c.chat.postMessage(data.payload.content, data.payload.image);
        return;
      } else if (data.type === "DELETE_CHAT") {
        const c = chats[data.payload.chatId];

        if (!c) {
          log("Error: Chat not found", { chatId: data.payload.chatId });
          return;
        }

        delete chats[data.payload.chatId];
        // TODO: c.chat.destroy(); ?
        return;
      } else {
        log("Error: Received message is not a valid type", { data });
        return;
      }
    });
  });
}

main();

function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
}

function asString(message: ws.RawData) {
  if (message instanceof Buffer) {
    return message.toString();
  } else if (typeof message === "string") {
    return message;
  } else {
    log("Error: Received message is not a string");
    return null;
  }
}
