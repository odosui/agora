import { useCallback } from "react";
import { Profile } from "../types";
import { useWs } from "../useWs";

const ChatStarter: React.FC<{
  profiles: Profile[];
  dbUuid: string;
  onStarted: () => void;
}> = ({ profiles, dbUuid, onStarted }) => {
  const { startChat } = useWs();

  const handleStartChat = useCallback((name: string) => {
    startChat(name, dbUuid);
    onStarted();
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
