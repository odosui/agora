import { useCallback, useEffect, useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useParams } from "react-router-dom";
import { ChatDto } from "../../../server/src/db/models/chats";
import { WsOutputMessage } from "../../../shared/types";
import Chat from "../Chat";
import api from "../api";
import ChatStarter from "../components/ChatStarter";
import { Profile } from "../types";
import { useWs } from "../useWs";

function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chats, setChats] = useState<ChatDto[]>([]);
  const params = useParams<{ id: string }>();
  const { lastMessage, deleteChat } = useWs();

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

  useEffect(() => {
    if (lastMessage !== null) {
      const msg = JSON.parse(lastMessage.data) as WsOutputMessage;
      handleWsMessage(msg);
    }
  }, [lastMessage, handleWsMessage]);

  useEffect(() => {
    async function fetchProfiles() {
      const data = await api.get<Profile[]>("/profiles");
      setProfiles(data);
    }

    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    async function fetchData() {
      // const db = await api.get<DashboardDto[]>(`/dashboards/${params.id}`);
      const chts = await api.get<ChatDto[]>(`/dashboards/${params.id}/chats`);
      setChats(chts);

      if (chts.length === 0) {
        console.log("No chats, showing chat starter");
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
      >
        {chats.map((chat) => (
          <div key={chat.uuid} className="chat-wrapper">
            <div className="top-menu">
              <div className="left">
                <div className="profile-name">{chat.profileName}</div>
              </div>
              <div className="right">
                <button
                  className="closeChat"
                  title="Delete chat"
                  aria-label="Delete chat"
                  aria-hidden="true"
                  onClick={() => handleDeleteChat(chat.uuid)}
                >
                  x
                </button>

                <div className="drag-handle">::</div>
              </div>
            </div>
            <div className="body">
              <Chat id={chat.uuid} />
            </div>
          </div>
        ))}
      </GridLayout>
      {profiles && (
        <>
          <div className="db-menu">
            <button onClick={() => setShowChatStarter((prev) => !prev)}>
              {showChatStarter ? "x" : "+"}
            </button>
          </div>
          {showChatStarter && (
            <ChatStarter
              profiles={profiles}
              dbUuid={params.id}
              onStarted={() => setShowChatStarter(false)}
            />
          )}
        </>
      )}
    </main>
  );
}

export default DashboardPage;
