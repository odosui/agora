import { Server } from "http";
import { WsInputMessage, WsOutputMessage } from "../../shared/types";
import ConfigFile from "./config_file";
import Chats, { chatDto } from "./db/models/chats";
import Dashboards from "./db/models/dashboards";
import Messages, { Message } from "./db/models/messages";
import { startWsServer } from "./framework/wsst";
import msgs from "./msgs";
import { log } from "./utils";
import { AnthropicChat } from "./vendors/anthropic";
import { OpenAiChat } from "./vendors/openai";

type ChatRecord = {
  profile: string;
  messages: [];
  chat: OpenAiChat | AnthropicChat;
};

const DEFAULT_SYSTEM =
  "You are a helpful assistant. You answer concisely and to the point.";

export async function runWS(server: Server) {
  const config: ConfigFile | null = await ConfigFile.readConfig();

  startWsServer<WsInputMessage, { chats: Record<string, ChatRecord> }>({
    server,
  })
    .on("START_CHAT", async (payload, { sendMsg, storage }) => {
      const db = await Dashboards.oneBy("uuid", payload.dbUuid);

      if (!db) {
        log("Error: Dashboard not found", { dbUuid: payload.dbUuid });
        sendMsg(msgs.generalError("Dashboard not found"));
        return;
      }

      const chat = await Chats.create({
        name: "New Chat",
        profile_name: payload.profile,
        dashboard_id: db.id,
      });

      if (!storage.chats) {
        storage.chats = {};
      }

      const chatEngine = initiateChat(
        storage.chats,
        chat.uuid,
        payload.profile,
        sendMsg
      );

      if (!chatEngine) {
        return;
      }

      log("Chat started", { uuid: chat.uuid, profile: payload.profile });
      sendMsg(msgs.chatStarted(chatDto(chat)));
      return;
    })
    .on("POST_MESSAGE", async (payload, { sendMsg, storage }) => {
      if (!storage.chats) {
        storage.chats = {};
      }

      const engine = await safeGetChatEngine(
        storage.chats,
        payload.chatId,
        sendMsg
      );

      if (!engine) {
        log("Error: Chat not found", { chatId: payload.chatId });
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      engine.postMessage(payload.content, payload.image);

      const chat = await Chats.oneBy("uuid", payload.chatId);

      if (!chat) {
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      await Messages.create({
        body: payload.content,
        kind: "user",
        chat_id: chat.id,
      });

      return;
    })
    .on("DELETE_CHAT", async (payload, { sendMsg, storage }) => {
      if (!storage.chats) {
        storage.chats = {};
      }
      const c = await safeGetChatEngine(storage.chats, payload.chatId, sendMsg);

      if (!c) {
        log("Error: Chat not found", { chatId: payload.chatId });
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      storage.chats[payload.chatId].chat.destroy();
      delete storage.chats[payload.chatId];
      Chats.deleteBy("uuid", payload.chatId);
      return;
    });

  // TODO: how to handle this?
  //       log("Error: Received message is not a valid type", { data });
  //       return;

  // Tries to get the chat engine from the memory,
  // if not found, tries to load the chat from the database
  // and then creates an instance of the chat engine in memory
  const safeGetChatEngine = async (
    chats: Record<string, ChatRecord>,
    uuid: string,
    sendMsg: (m: WsOutputMessage) => void
  ) => {
    const e = chats[uuid];

    if (e) {
      return e.chat;
    }

    if (!e) {
      // trying to load from the database
      const chat = await Chats.oneBy("uuid", uuid);

      // TODO: do we need to check the dashboard?
      if (!chat) {
        return null;
      }

      const messages = await Messages.allBy("chat_id", chat.id, [
        "created_at",
        "ASC",
      ]);

      const chatEngine = initiateChat(
        chats,
        chat.uuid,
        chat.profile_name,
        sendMsg,
        messages
      );
      return chatEngine;
    }
  };

  // Creates an instance of the chat engine in memory
  const initiateChat = (
    chats: Record<string, ChatRecord>,
    uuid: string,
    profile: string,
    sendMsg: (m: WsOutputMessage) => void,
    messages: Message[] = []
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
      p.system ?? DEFAULT_SYSTEM,
      messages.map((m) => ({
        role: m.kind as "assistant" | "user",
        content: m.body,
      }))
    );

    chats[uuid] = {
      profile: profile,
      messages: [],
      chat: chatEngine,
    };

    chatEngine.onPartialReply((msg) => {
      sendMsg(msgs.partialReply(uuid, msg));
    });

    chatEngine.onReplyFinish(async (msg) => {
      const chat = await Chats.oneBy("uuid", uuid);

      if (!chat) {
        sendMsg(msgs.generalError("Chat not found"));
        return;
      }

      await Messages.create({
        body: msg,
        // role
        kind: "assistant",
        chat_id: chat.id,
      });

      sendMsg(msgs.replyFinish(uuid));
    });

    chatEngine.onError((err) => {
      sendMsg(msgs.chatError(uuid, err));
    });

    return chatEngine;
  };
}
