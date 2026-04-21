import { useState, useEffect } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { updateBusinessSettings, uploadBusinessLogo } from "../services/settingsActions";
import FormFieldEditor from "../components/FormFieldEditor";
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

export default function SettingsPage() {
  const { businessId } = useStaffAuth();
  const { business, secrets, loading } = useBusinessSettings(businessId!);

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

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPrimaryColor(business.primaryColor);
      setWhatsappNumber(business.whatsappNumber);
      setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
      setThreshold(String(business.approachingThreshold));
      setFormFields(business.formFields ?? []);
      setLogoUri(business.logo ?? "");
      setDirty(false);
    }
  }, [business]);

  useEffect(() => {
    if (secrets) {
      setWhatsappApiKey(secrets.whatsappApiKey ?? "");
    }
  }, [secrets]);

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
      <FormFieldEditor
        formFields={formFields}
        onChange={(f) => { setFormFields(f); setDirty(true); }}
      />

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
