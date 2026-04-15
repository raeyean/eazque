import { useState, useEffect } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { updateBusinessSettings, uploadBusinessLogo } from "../services/settingsActions";
import type { FormField } from "@eazque/shared";

const INITIALS_COLORS = [
  "#B8926A","#8B6F47","#A0845C","#C4A882","#6B5240","#D4956A",
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0]?.toUpperCase() ?? "") + (words[1][0]?.toUpperCase() ?? "");
}

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

type FieldType = "text" | "number" | "dropdown" | "checkbox";

export default function SettingsPage() {
  const { businessId } = useStaffAuth();
  const { business, loading } = useBusinessSettings(businessId!);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [threshold, setThreshold] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [logoUri, setLogoUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Field editor state
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editorLabel, setEditorLabel] = useState("");
  const [editorType, setEditorType] = useState<FieldType>("text");
  const [editorRequired, setEditorRequired] = useState(false);
  const [editorOptions, setEditorOptions] = useState("");

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPrimaryColor(business.primaryColor);
      setWhatsappNumber(business.whatsappNumber);
      setWhatsappApiKey(business.whatsappApiKey);
      setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
      setThreshold(String(business.approachingThreshold));
      setFormFields(business.formFields ?? []);
      setLogoUri(business.logo ?? "");
      setDirty(false);
    }
  }, [business]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousUri = logoUri;
    setLogoUri(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadBusinessLogo(businessId!, file);
      setLogoUri(url);
    } catch {
      alert("Failed to upload logo. Please try again.");
      setLogoUri(previousUri);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const parsedTime = Number(estimatedTime);
    const parsedThreshold = Number(threshold);
    if (!name.trim()) { alert("Business name is required."); return; }
    if (isNaN(parsedTime) || parsedTime <= 0) { alert("Estimated time must be a positive number."); return; }
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || !Number.isInteger(parsedThreshold)) {
      alert("Approaching threshold must be a positive whole number."); return;
    }
    setSaving(true);
    try {
      await updateBusinessSettings(businessId!, {
        name: name.trim(),
        primaryColor: primaryColor.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappApiKey: whatsappApiKey.trim(),
        defaultEstimatedTimePerCustomer: parsedTime,
        approachingThreshold: parsedThreshold,
        formFields,
      });
      setDirty(false);
      alert("Settings saved.");
    } catch {
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
    setEditorType(field.type as FieldType);
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
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = field; return next;
      }
      return [...prev, field];
    });
    setDirty(true);
    setShowFieldEditor(false);
  };

  const handleFieldDelete = (fieldId: string) => {
    if (confirm("Remove this form field?")) {
      setFormFields((prev) => prev.filter((f) => f.id !== fieldId));
      setDirty(true);
    }
  };

  if (loading || !business) return <div className="loading">Loading settings...</div>;

  return (
    <div className="staff-page" style={{ maxWidth: 600 }}>
      <h1>Settings</h1>

      {/* Logo */}
      <div className="staff-section-title">Business Profile</div>
      <div className="staff-logo-section">
        {logoUri ? (
          <img src={logoUri} alt={name} className="staff-logo-preview" />
        ) : (
          <div
            className="staff-logo-initials"
            style={{ backgroundColor: getInitialsColor(name || business.name) }}
          >
            {getInitials(name || business.name)}
          </div>
        )}
        <div>
          <label className="staff-btn" style={{ cursor: "pointer" }}>
            {uploading ? "Uploading..." : "Change Photo"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="staff-form">
        <div>
          <label htmlFor="biz-name">Business Name</label>
          <input id="biz-name" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="primary-color">Primary Color</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); }} style={{ width: 48, height: 36, padding: 2, border: "1px solid #d4b896", borderRadius: 6 }} />
            <input id="primary-color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); }} style={{ flex: 1 }} />
          </div>
        </div>
        <div>
          <label htmlFor="whatsapp-number">WhatsApp Number</label>
          <input id="whatsapp-number" value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="whatsapp-key">WhatsApp API Key</label>
          <input id="whatsapp-key" type="password" value={whatsappApiKey} onChange={(e) => { setWhatsappApiKey(e.target.value); setDirty(true); }} />
        </div>
      </div>

      <div className="staff-section-title">Queue Defaults</div>
      <div className="staff-form">
        <div>
          <label htmlFor="est-time">Estimated Time per Customer (min)</label>
          <input id="est-time" type="number" min={1} value={estimatedTime} onChange={(e) => { setEstimatedTime(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label htmlFor="threshold">Approaching Threshold</label>
          <input id="threshold" type="number" min={1} value={threshold} onChange={(e) => { setThreshold(e.target.value); setDirty(true); }} />
        </div>
      </div>

      <div className="staff-section-title">Customer Form Fields</div>
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
              <label>Label</label>
              <input value={editorLabel} onChange={(e) => setEditorLabel(e.target.value)} />
            </div>
            <div>
              <label>Type</label>
              <select value={editorType} onChange={(e) => setEditorType(e.target.value as FieldType)}>
                <option value="text">Text</option>
                <option value="number">Number</option>
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

      <button
        className="staff-btn"
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{ width: "100%", marginTop: "1rem" }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
