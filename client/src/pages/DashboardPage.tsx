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
import NavBar from "../features/layout/NavBar";
import { useWs } from "../useWs";

// hard-coded in ui
// but positions are saved in db
// hmmmm
const COLS = 128;
const COL_WIDTH = 32; // px
const ROW_HEIGHT = 32; // px
const GRID_WIDTH = COLS * COL_WIDTH;
const MIN_WIDTH = 4;

const DEFAULT_W = 8;
const DEFAULT_H = 12;

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

  const layout: GridLayout.Layout[] = [...chats, ...widgets].map((o) => ({
    i: o.uuid,
    x: o.position?.x ?? 0,
    y: o.position?.y ?? Infinity,
    w: o.position?.w ?? DEFAULT_W,
    h: o.position?.h ?? DEFAULT_H,
    minW: MIN_WIDTH,
  }));

  // TODO: track and only update
  // the changed layout items
  const handleLayoutChange = useCallback(
    (lay: GridLayout.Layout[]) => {
      lay.forEach((l) => {
        const pos = JSON.stringify({
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        });

        const chat = chats.find((c) => c.uuid === l.i);
        if (chat) {
          api.patch(`/chats/${chat.uuid}`, {
            position: pos,
          });
        } else {
          const widget = widgets.find((w) => w.uuid === l.i);
          if (widget) {
            api.patch(`/widgets/${widget.uuid}`, {
              position: pos,
            });
          } else {
            console.error("Unknown layout item:", l.i);
          }
        }
      });
    },
    [widgets, chats]
  );

  return (
    <div className="layout-wrapper">
      <aside>
        <NavBar />
      </aside>
      <main className={`app ${chats.length === 0 ? "no-chats" : ""}`}>
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={GRID_WIDTH}
          onLayoutChange={handleLayoutChange}
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
              <Chat
                id={chat.uuid}
                profileName={chat.profileName}
                onDelete={() => handleDeleteChat(chat.uuid)}
              />
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
    </div>
  );
}

export default DashboardPage;
