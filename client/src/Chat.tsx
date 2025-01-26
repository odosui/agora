import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { WsOutputMessage } from "../../shared/types";
import { useWs } from "./useWs";
import api from "./api";
import { MessageDto } from "../../server/src/db/models/messages";
import TextareaAutosize from "react-textarea-autosize";
import DeleteButton from "./components/DeleteButton";
import DragIcon from "./components/icons/DragIcon";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: {
    data: string;
    type: string;
  };
};

const Chat: React.FC<{
  id: string;
  profileName: string;
  onDelete: () => void;
}> = ({ id, profileName, onDelete }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [waitingTillReplyFinish, setWaitingTillReplyFinish] =
    useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const { postMessage, lastMessage, readyState } = useWs();

  const [file, setFile] = useState<{
    data: string;
    type: string;
  } | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    setWaitingTillReplyFinish(true);
    setMessages((prev) => {
      const newMessage: Message = {
        role: "user",
        content: message,
      };

      if (file) {
        newMessage.image = file;
      }

      return [...prev, newMessage];
    });
    postMessage(message, id, file ?? undefined);
    setMessage("");
    setFile(null);
    taRef.current?.focus();
  };

  const handleWsMessage = useCallback(
    (msg: WsOutputMessage) => {
      if (msg.type === "CHAT_PARTIAL_REPLY") {
        if (msg.payload.chatId !== id) return;
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === "assistant") {
            return [
              ...prev.slice(0, prev.length - 1),
              {
                role: "assistant",
                content: lastMsg.content + msg.payload.content,
              },
            ];
          } else {
            return [
              ...prev,
              { role: "assistant", content: msg.payload.content },
            ];
          }
        });
      } else if (msg.type === "CHAT_REPLY_FINISH") {
        if (msg.payload.chatId !== id) return;
        setWaitingTillReplyFinish(false);
      } else if (msg.type === "CHAT_ERROR") {
        if (msg.payload.chatId !== id) return;
        setChatError(msg.payload.error);
      } else {
        // don't care
      }
    },
    [id]
  );

  const handleAttachImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const mediaType = file.type;
      const base64 = await fileToBase64(file);

      setFile({ data: base64, type: mediaType });
    };
    input.click();
  };

  useEffect(() => {
    // scroll to bottom
    messagesRef.current?.scrollTo(0, messagesRef.current?.scrollHeight);
  }, [messages]);

  useEffect(() => {
    if (lastMessage !== null) {
      const msg = JSON.parse(lastMessage.data) as WsOutputMessage;
      handleWsMessage(msg);
    }
  }, [lastMessage, handleWsMessage]);

  useEffect(() => {
    async function loadMessages() {
      const msgs = await api.get<MessageDto[]>(`/chats/${id}/messages`);
      setMessages(
        msgs.map((m) => ({
          role: m.kind === "user" ? "user" : "assistant",
          content: m.body,
        }))
      );
    }
    loadMessages();
  }, []);

  return (
    <>
      <div className="top-menu">
        <div className="left">
          <div className="profile-name">{profileName}</div>
        </div>
        <div className="right">
          <DeleteButton onDelete={onDelete} />
          <div className="drag-handle">
            <DragIcon />
          </div>
        </div>
      </div>
      <div className="body">
        <div className="chat">
          <div className="messages" ref={messagesRef}>
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div className="from">
                  {m.role} {m.role === "assistant" ? "🤖" : ""}
                </div>
                <div className="content">
                  <Markdown>{m.content}</Markdown>
                </div>
                {m.image && (
                  <div className="message-image">
                    <img
                      src={`data:${m.image.type};base64,${m.image.data}`}
                      alt="Attached"
                    />
                  </div>
                )}
              </div>
            ))}

            {chatError && <div className="message error">{chatError}</div>}
          </div>

          <div className="message-form">
            <div className="message-form-main">
              <div className="attach-wrapper">
                <a
                  href="#"
                  onClick={handleAttachImage}
                  role="button"
                  title="Attach an image"
                >
                  @
                </a>
              </div>
              <TextareaAutosize
                onKeyDown={(e) => {
                  // Submit on CMD+Enter
                  if (e.key === "Enter" && e.metaKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                minRows={5}
                maxRows={30} // Adjust as needed
                className="auto-resize-textarea"
                autoFocus
              />

              <button
                type="submit"
                onClick={handleSendMessage}
                disabled={!readyState || waitingTillReplyFinish || !!chatError}
              >
                ⌘↩
              </button>
            </div>
            <div className="message-form-footer">
              {file && (
                <div className="attached">
                  <img
                    src={`data:${file.type};base64,${file.data}`}
                    alt="Attached"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

async function fileToBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64] = result.split(",");
        resolve(base64);
      } else {
        reject(new Error("FileReader result is not a string"));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}

export default Chat;
