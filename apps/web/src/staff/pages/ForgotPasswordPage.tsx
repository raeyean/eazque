import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch {
      // Don't reveal whether the email exists
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <h1>Reset Password</h1>

      {sent ? (
        <div>
          <p style={{ textAlign: "center", color: "#4caf50", fontWeight: 600, marginBottom: "1rem" }}>
            If that email is registered, you'll receive a reset link shortly.
          </p>
          <p style={{ textAlign: "center" }}>
            <Link to="/staff/login">Back to login</Link>
          </p>
        </div>
      ) : (
        <>
          <p style={{ textAlign: "center", color: "#8b6f47", marginBottom: "1.25rem" }}>
            Enter your email and we'll send you a reset link.
          </p>
          <form className="staff-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button className="staff-btn" type="submit" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to="/staff/login">Back to login</Link>
          </p>
        </>
      )}
    </div>
  );
}
