import { useCallback, useEffect, useState } from "react";
import Chat from "./Chat";
import api from "./api";
import { useWs } from "./useWs";
import { WsOutputMessage } from "../../shared/types";
import { ChatData, Profile } from "./types";
import ChatStarter from "./components/ChatStarter";

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chats, setChats] = useState<ChatData[]>([]);

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

  const handleDeleteChat = useCallback((id: string) => {
    deleteChat(id);
    setChats((prev) => prev.filter((chat) => chat.id !== id));
  }, []);

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
      {profiles && <ChatStarter profiles={profiles} />}
    </main>
  );
}

export default App;
