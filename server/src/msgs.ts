/**
 * Quick way to create a message object.
 */

import { WsOutputMessage } from "../../shared/types";

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

function chatStarted(id: string, profile: string): WsOutputMessage {
  return {
    type: "CHAT_STARTED",
    payload: {
      name: profile,
      id,
    },
  };
}

const msgs = {
  partialReply,
  replyFinish,
  generalError,
  chatError,
  chatStarted,
};

export default msgs;
