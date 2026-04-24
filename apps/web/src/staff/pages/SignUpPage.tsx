import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStaffAuth } from "../StaffAuthContext";
import FormFieldEditor from "../components/FormFieldEditor";
import type { FormField } from "@eazque/shared";
import { PRIMARY_COLOR_DEFAULT } from "@eazque/shared";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("10");
  const [approachingThreshold, setApproachingThreshold] = useState("3");
  const [primaryColor, setPrimaryColor] = useState(PRIMARY_COLOR_DEFAULT);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { signUp } = useStaffAuth();
  const navigate = useNavigate();

  const isDisabled = !email || password.length < 6 || !ownerName || !businessName || submitting;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signUp(
        {
          email,
          password,
          ownerName,
          businessName,
          whatsappNumber,
          estimatedTime: Number(estimatedTime) || undefined,
          approachingThreshold: Number(approachingThreshold) || undefined,
          primaryColor,
          formFields,
        },
        logoFile,
      );
      navigate("/staff/queue");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "functions/already-exists") {
        setError("Email already registered. Try signing in.");
      } else if (code === "functions/invalid-argument") {
        setError("Please check your inputs and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-login-page" style={{ maxWidth: 560 }}>
      <h1>Create Business Account</h1>
      <form onSubmit={handleSubmit}>
        <section>
          <div className="staff-section-title">Account</div>
          <div className="staff-form">
            <div>
              <label htmlFor="owner-name">Owner Name</label>
              <input
                id="owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="staff-section-title">Business Info</div>
          <div className="staff-form">
            <div>
              <label htmlFor="business-name">Business Name</label>
              <input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="whatsapp-number">WhatsApp Number</label>
              <input
                id="whatsapp-number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="estimated-time">Estimated Time per Customer (min)</label>
              <input
                id="estimated-time"
                type="number"
                min={1}
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="approaching-threshold">Approaching Threshold</label>
              <input
                id="approaching-threshold"
                type="number"
                min={1}
                value={approachingThreshold}
                onChange={(e) => setApproachingThreshold(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="staff-section-title">Branding</div>
          <div className="staff-form">
            <div>
              <label htmlFor="logo">Business Logo</label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" style={{ marginTop: "0.5rem", maxWidth: 120, maxHeight: 120, borderRadius: 8 }} />
              )}
            </div>
            <div>
              <label htmlFor="primary-color">Primary Color</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: 48, height: 36, padding: 2, border: "1px solid #d4b896", borderRadius: 6 }}
                />
                <input
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="staff-section-title">Customer Form Fields</div>
          <FormFieldEditor formFields={formFields} onChange={setFormFields} />
        </section>

        {error && <div className="error-message">{error}</div>}
        <button
          className="staff-btn"
          type="submit"
          disabled={isDisabled}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        Already have an account? <Link to="/staff/login">Sign in</Link>
      </p>
    </div>
  );
}
