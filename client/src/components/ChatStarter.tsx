import { useCallback, useEffect, useState } from "react";
import { Profile } from "../types";
import { useWs } from "../useWs";
import api from "../api";

const ChatStarter: React.FC<{
  dbUuid: string;
  onStarted: () => void;
}> = ({ dbUuid, onStarted }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const { startChat } = useWs();

  const handleStartChat = useCallback((name: string) => {
    startChat(name, dbUuid);
    onStarted();
  }, []);

  useEffect(() => {
    async function fetchProfiles() {
      const data = await api.get<Profile[]>("/profiles");
      setProfiles(data);
    }

    fetchProfiles();
  }, []);

  const groupped = profiles.reduce((acc, profile) => {
    acc[profile.vendor] = acc[profile.vendor] || [];
    acc[profile.vendor].push(profile);
    return acc;
  }, {} as Record<string, Profile[]>);

  return (
    <div className="chat-starter">
      <h2>Start a new chat</h2>

      {Object.entries(groupped)
        .sort()
        .map(([vendor, profiles]) => (
          <div key={vendor} className="chat-starter-vendor">
            <h3>{vendor}</h3>
            <ul>
              {profiles.map((profile) => (
                <li key={profile.name}>
                  <button onClick={() => handleStartChat(profile.name)}>
                    {profile.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
};

export default ChatStarter;
