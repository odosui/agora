import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardDto } from "../../../server/src/db/models/dashboards";
import { WsOutputMessage } from "../../../shared/types";
import Chat from "../Chat";
import api from "../api";
import ChatStarter from "../components/ChatStarter";
import { ChatData, Profile } from "../types";
import { useWs } from "../useWs";

function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chats, setChats] = useState<ChatData[]>([]);
  const params = useParams<{ id: string }>();
  const { lastMessage, deleteChat } = useWs();

  const handleWsMessage = useCallback((msg: WsOutputMessage) => {
    if (msg.type === "CHAT_STARTED") {
      setChats((prev) => [
        ...prev,
        { id: msg.payload.id, name: msg.payload.name },
      ]);
    } else {
      // don't care
    }
  }, []);

  const handleDeleteChat = useCallback(
    (id: string) => {
      deleteChat(id);
      setChats((prev) => prev.filter((chat) => chat.id !== id));
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

    async function fetchDb() {
      const data = await api.get<DashboardDto[]>(`/dashboards/${params.id}`);
      console.log(data);
    }

    fetchDb();
  }, [params.id]);

  if (!params.id) {
    return null;
  }

  return (
    <main className={`app ${chats.length === 0 ? "no-chats" : ""}`}>
      {chats.map((chat) => (
        <Chat
          key={chat.id}
          id={chat.id}
          name={chat.name}
          onDelete={() => handleDeleteChat(chat.id)}
        />
      ))}
      {profiles && <ChatStarter profiles={profiles} dbUuid={params.id} />}
    </main>
  );
}

export default DashboardPage;
