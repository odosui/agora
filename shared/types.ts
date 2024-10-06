export type WsInputMessage =
  | {
      type: "POST_MESSAGE";
      payload: {
        content: string;
        image?: {
          data: string;
          type: string;
        };
        chatId: string;
      };
    }
  | {
      type: "START_CHAT";
      payload: {
        profile: string;
        dbUuid: string;
      };
    }
  | {
      type: "DELETE_CHAT";
      payload: {
        chatId: string;
      };
    };

export type WsInputMessageType = WsInputMessage["type"];

export type WsOutputMessage =
  | {
      type: "CHAT_STARTED";
      payload: {
        name: string;
        id: string;
      };
    }
  | {
      type: "CHAT_PARTIAL_REPLY";
      payload: {
        chatId: string;
        content: string;
      };
    }
  | {
      type: "CHAT_REPLY_FINISH";
      payload: {
        chatId: string;
      };
    }
  | {
      type: "CHAT_ERROR";
      payload: {
        chatId: string;
        error: string;
      };
    }
  | {
      type: "GENERAL_ERROR";
      payload: {
        error: string;
      };
    };

export type WsOutputMessageType = WsOutputMessage["type"];
