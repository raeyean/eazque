import { useState } from "react";
import type { FormField } from "@eazque/shared";

type FieldType = "text" | "number" | "phone" | "dropdown" | "checkbox";

interface Props {
  formFields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormFieldEditor({ formFields, onChange }: Props) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editorLabel, setEditorLabel] = useState("");
  const [editorType, setEditorType] = useState<FieldType>("text");
  const [editorRequired, setEditorRequired] = useState(false);
  const [editorOptions, setEditorOptions] = useState("");

  const openAddField = () => {
    setEditingField(null);
    setEditorLabel("");
    setEditorType("text");
    setEditorRequired(false);
    setEditorOptions("");
    setShowFieldEditor(true);
  };

  const openEditField = (field: FormField) => {
    setEditingField(field);
    setEditorLabel(field.label);
    setEditorType(field.type as "text" | "number" | "phone" | "dropdown" | "checkbox");
    setEditorRequired(field.required);
    setEditorOptions(field.options?.join(", ") ?? "");
    setShowFieldEditor(true);
  };

  const handleFieldSave = () => {
    if (!editorLabel.trim()) { alert("Label is required."); return; }
    const field: FormField = {
      id: editingField?.id ?? crypto.randomUUID(),
      label: editorLabel.trim(),
      type: editorType,
      required: editorRequired,
      options: editorType === "dropdown"
        ? editorOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined,
    };
    const idx = formFields.findIndex((f) => f.id === field.id);
    let newFields: FormField[];
    if (idx >= 0) {
      newFields = [...formFields];
      newFields[idx] = field;
    } else {
      newFields = [...formFields, field];
    }
    onChange(newFields);
    setShowFieldEditor(false);
  };

  const handleFieldDelete = (fieldId: string) => {
    if (confirm("Remove this form field?")) {
      onChange(formFields.filter((f) => f.id !== fieldId));
    }
  };

  return (
    <>
      {formFields.map((field) => (
        <div key={field.id} className="staff-field-item">
          <span>{field.label} <em style={{ fontSize: "0.8rem", color: "#8b6f47" }}>({field.type})</em></span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => openEditField(field)} style={{ background: "none", border: "1px solid #d4b896", padding: "0.25rem 0.75rem", borderRadius: 6, cursor: "pointer" }}>Edit</button>
            <button onClick={() => handleFieldDelete(field.id)} style={{ background: "none", border: "1px solid #fde2e2", color: "#c0392b", padding: "0.25rem 0.75rem", borderRadius: 6, cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={openAddField} style={{ background: "none", border: "none", color: "#b8926a", fontWeight: 600, cursor: "pointer", marginBottom: "1.5rem" }}>
        + Add Field
      </button>

      {showFieldEditor && (
        <div className="staff-inline-form" style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>{editingField ? "Edit Field" : "Add Field"}</div>
          <div className="staff-form">
            <div>
              <label htmlFor="field-editor-label">Label</label>
              <input id="field-editor-label" value={editorLabel} onChange={(e) => setEditorLabel(e.target.value)} />
            </div>
            <div>
              <label>Type</label>
              <select value={editorType} onChange={(e) => setEditorType(e.target.value as FieldType)}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="phone">Phone</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            {editorType === "dropdown" && (
              <div>
                <label>Options (comma-separated)</label>
                <input value={editorOptions} onChange={(e) => setEditorOptions(e.target.value)} placeholder="e.g. Option A, Option B" />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="field-required" checked={editorRequired} onChange={(e) => setEditorRequired(e.target.checked)} />
              <label htmlFor="field-required">Required</label>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="staff-btn" onClick={handleFieldSave}>Save</button>
              <button onClick={() => setShowFieldEditor(false)} style={{ background: "none", border: "1px solid #d4b896", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
