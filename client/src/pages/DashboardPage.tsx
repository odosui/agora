import { useCallback, useEffect, useState } from "react";
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
    }

    fetchData();
  }, [params.id]);

  if (!params.id) {
    return null;
  }

  return (
    <main className={`app ${chats.length === 0 ? "no-chats" : ""}`}>
      {chats.map((chat) => (
        <Chat
          key={chat.uuid}
          id={chat.uuid}
          name={chat.profileName}
          onDelete={() => handleDeleteChat(chat.uuid)}
        />
      ))}
      {profiles && <ChatStarter profiles={profiles} dbUuid={params.id} />}
    </main>
  );
}

export default DashboardPage;
