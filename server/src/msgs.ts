/**
 * Quick way to create a message object.
 */

import { WsOutputMessage } from "../../shared/types";
import { ChatDto } from "./db/models/chats";
import { WidgetDto } from "./db/models/widgets";
import { ReplyMsgKind } from "./vendors/chat_engine";

function partialReply(
  id: string,
  content: string,
  kind: ReplyMsgKind
): WsOutputMessage {
  return {
    type: "CHAT_PARTIAL_REPLY",
    payload: {
      chatId: id,
      content,
      kind,
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

function generalError(error: string): WsOutputMessage {
  return {
    type: "GENERAL_ERROR",
    payload: {
      error,
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

function chatStarted(chat: ChatDto): WsOutputMessage {
  return {
    type: "CHAT_STARTED",
    payload: chat,
  };
}

function widgetUpdated(w: WidgetDto): WsOutputMessage {
  return {
    type: "WIDGET_UPDATED",
    payload: {
      widget: w,
    },
  };
}

const msgs = {
  partialReply,
  replyFinish,
  generalError,
  chatError,
  chatStarted,
  widgetUpdated,
};

export default msgs;
