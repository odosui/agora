import useWebSocket from "react-use-websocket";
import { WsInputMessage } from "../../shared/types";

const WS_URL = "ws://localhost:3000";

export function useWs() {
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
    share: true,
  });

  const startChat = (profile: string) => {
    const e: WsInputMessage = {
      type: "START_CHAT",
      payload: {
        profile,
      },
    };

    sendJsonMessage(e);
  };

  const deleteChat = (chatId: string) => {
    const e: WsInputMessage = {
      type: "DELETE_CHAT",
      payload: {
        chatId,
      },
    };

    sendJsonMessage(e);
  };

  const postMessage = (
    message: string,
    chatId: string,
    file?: {
      data: string;
      type: string;
    }
  ) => {
    const e: WsInputMessage = {
      type: "POST_MESSAGE",
      payload: {
        content: message,
        image: file,
        chatId,
      },
    };

    sendJsonMessage(e);
  };

  return {
    postMessage,
    startChat,
    lastMessage,
    readyState,
    deleteChat,
  };
}
