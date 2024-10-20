import { useCallback, useEffect, useState } from "react";
import GridLayout from "react-grid-layout";
import { useParams } from "react-router-dom";
import { ChatDto } from "../../../server/src/db/models/chats";
import { WidgetDto } from "../../../server/src/db/models/widgets";
import { WsOutputMessage } from "../../../shared/types";
import Chat from "../Chat";
import Widget from "../Widget";
import api from "../api";
import ChatStarter from "../components/ChatStarter";
import { useWs } from "../useWs";

function DashboardPage() {
  const { lastMessage, deleteChat } = useWs();
  const params = useParams<{ id: string }>();

  const [chats, setChats] = useState<ChatDto[]>([]);
  const [widgets, setWidgets] = useState<WidgetDto[]>([]);
  const [showChatStarter, setShowChatStarter] = useState(false);

  const handleWsMessage = useCallback((msg: WsOutputMessage) => {
    if (msg.type === "CHAT_STARTED") {
      setChats((prev) => [...prev, msg.payload]);
    } else if (msg.type === "GENERAL_ERROR") {
      console.error("WS Server Error:", msg.payload.error);
    } else {
      // don't care
    }
  }, []);

  const handleDeleteChat = useCallback(
    (id: string) => {
      if (!confirm("Are you sure you want to delete this chat?")) {
        return;
      }

      deleteChat(id);
      setChats((prev) => prev.filter((chat) => chat.uuid !== id));
    },
    [deleteChat]
  );
  // Add a state to track dragging
  const [isDragging, setDragging] = useState(false);

  // Handle drag events in your component
  const onDragStart = () => setDragging(true);
  const onDragStop = () => setDragging(false);

  useEffect(() => {
    if (lastMessage !== null) {
      const msg = JSON.parse(lastMessage.data) as WsOutputMessage;
      handleWsMessage(msg);
    }
  }, [lastMessage, handleWsMessage]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    async function fetchData() {
      // const db = await api.get<DashboardDto[]>(`/dashboards/${params.id}`);
      const chts = await api.get<ChatDto[]>(`/dashboards/${params.id}/chats`);
      setChats(chts);

      const ws = await api.get<WidgetDto[]>(`/dashboards/${params.id}/widgets`);
      setWidgets(ws);

      if (chts.length === 0 && ws.length === 0) {
        console.log("Empty board, showing chat starter");
        setShowChatStarter(true);
      }
    }

    fetchData();
  }, [params.id]);

  if (!params.id) {
    return null;
  }

  const layout: GridLayout.Layout[] = chats.map((chat, i) => ({
    i: chat.uuid,
    x: i * 4,
    y: i * 2,
    w: 4,
    h: 16,
  }));

  widgets.forEach((widget, i) => {
    layout.push({
      i: widget.uuid,
      x: i * 4,
      y: i * 2,
      w: 4,
      h: 16,
    });
  });

  return (
    <main className={`app ${chats.length === 0 ? "no-chats" : ""}`}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        onLayoutChange={(...data) => {
          console.log("onLayoutChange", data);
        }}
        draggableHandle=".drag-handle"
        onDragStart={onDragStart}
        onDragStop={onDragStop}
      >
        {chats.map((chat) => (
          <div
            key={chat.uuid}
            className="chat-wrapper"
            style={{ userSelect: isDragging ? "none" : "auto" }}
          >
            <div className="top-menu">
              <div className="left">
                <div className="profile-name">{chat.profileName}</div>
              </div>
              <div className="right">
                <DeleteButton onDelete={() => handleDeleteChat(chat.uuid)} />
                <div className="drag-handle">::</div>
              </div>
            </div>
            <div className="body">
              <Chat id={chat.uuid} />
            </div>
          </div>
        ))}
        {widgets.map((w) => (
          <div
            key={w.uuid}
            className="chat-wrapper"
            style={{ userSelect: isDragging ? "none" : "auto" }}
          >
            <Widget widget={w} onDelete={() => handleDeleteChat(w.uuid)} />
          </div>
        ))}
      </GridLayout>
      <div className="db-menu">
        <button onClick={() => setShowChatStarter((prev) => !prev)}>
          {showChatStarter ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          )}
        </button>
      </div>
      {showChatStarter && (
        <ChatStarter
          dbUuid={params.id}
          onStarted={() => setShowChatStarter(false)}
        />
      )}
    </main>
  );
}

export default DashboardPage;

const DeleteButton: React.FC<{
  onDelete: () => void;
}> = ({ onDelete }) => {
  return (
    <button
      className="closeChat"
      title="Delete chat"
      aria-label="Delete chat"
      aria-hidden="true"
      onClick={onDelete}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
};
