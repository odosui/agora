import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { WidgetDto } from "../../server/src/db/models/widgets";
import { WsOutputMessage } from "../../shared/types";
import WidgetForm from "./WidgetForm";
import DeleteButton from "./components/DeleteButton";
import EditButton from "./components/EditButton";
import RunButton from "./components/RunButton";
import { useWs } from "./useWs";

const Widget: React.FC<{
  widget: WidgetDto;
  onDelete: () => void;
}> = ({ widget, onDelete }) => {
  const { runWidget, lastMessage } = useWs();

  const [editView, setEditView] = useState(false);
  const [w, setW] = useState<WidgetDto>(widget);

  const handleEdit = () => {
    setEditView(true);
  };

  const handleRun = async () => {
    runWidget(w.uuid);
  };

  useEffect(() => {
    if (lastMessage !== null) {
      const msg = JSON.parse(lastMessage.data) as WsOutputMessage;

      if (msg.type === "WIDGET_UPDATED" && msg.payload.widget.uuid === w.uuid) {
        setW(msg.payload.widget);
      }
    }
  }, [lastMessage]);

  return (
    <>
      <div className="top-menu">
        <div className="left">
          <div className="profile-name">{w.name}</div>
        </div>
        <div className="right">
          <RunButton
            onClick={handleRun}
            disabled={w.lastRun?.status === "running"}
          />
          <EditButton onClick={handleEdit} />
          <DeleteButton onDelete={onDelete} />
          <div className="drag-handle">::</div>
        </div>
      </div>
      <div className="body">
        {editView ? (
          <WidgetForm
            initialName={w.name}
            initialInput={w.input}
            templateName={w.templateName}
            uuid={w.uuid}
            onSave={(w) => {
              setEditView(false);
            }}
          />
        ) : (
          <div className="widget">
            {w.lastRun?.status === "running" && (
              <div className="running">
                <div>Running...</div>
                <div className="loader"></div>
              </div>
            )}
            {w.lastRun?.status === "finished" && (
              <Markdown>{w.lastRun.output}</Markdown>
            )}
            {w.lastRun?.status === "error" && (
              <div>Error: ${w.lastRun.error}</div>
            )}
            {!w.lastRun && <div>Not ran yet...</div>}
          </div>
        )}
      </div>
    </>
  );
};

export default Widget;
