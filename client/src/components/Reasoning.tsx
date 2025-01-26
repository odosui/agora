import { useState } from "react";
import Markdown from "react-markdown";

const Reasoning: React.FC<{ reasoning: string }> = ({ reasoning }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <div className="reasoning">
      <div className="reasoning-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? "- " : "+ "}
        Reasoning...
      </div>
      <div
        className={`reasoning-content ${expanded ? "expanded" : ""}`}
        style={{
          maxHeight: expanded ? "1000px" : "0",
        }}
      >
        <Markdown>{reasoning}</Markdown>
      </div>
    </div>
  );
};

export default Reasoning;
