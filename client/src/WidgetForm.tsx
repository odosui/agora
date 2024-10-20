import { useState } from "react";
import api from "./api";
import { WidgetDto } from "../../server/src/db/models/widgets";

const WidgetForm: React.FC<{
  initialName: string;
  initialInput: string;
  templateName: string;
  uuid?: string;
  onSave: (w: WidgetDto) => void;
}> = ({ initialName, initialInput, uuid, onSave, templateName }) => {
  const [name, setName] = useState(initialName);
  const [input, setInput] = useState(initialInput);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsDirty(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    if (uuid) {
      setSaving(true);
      const w = await api.patch<WidgetDto>(`/widgets/${uuid}`, { name, input });
      setSaving(false);
      onSave(w);
    } else {
      // TODO: implement
    }

    // Save the widget
    setIsDirty(false);
  };

  return (
    <div className="widget-form">
      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            autoFocus
          />
        </div>
        <div className="form-item">
          <label>Template</label>
          <input type="text" value={templateName} disabled />
        </div>
        <div className="form-item">
          <label>Input</label>
          <textarea value={input} onChange={handleInputChange} />
        </div>
        <div className="form-item">
          <button
            className="primary"
            type="submit"
            disabled={!isDirty || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WidgetForm;
