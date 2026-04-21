import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../StaffAuthContext";

export default function LoginPage() {
  const { signIn } = useStaffAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/staff/queue");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <h1>Staff Login</h1>
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
            autoComplete="current-password"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button className="staff-btn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        New business? <a href="/staff/signup">Create an account</a>
      </p>
    </div>
  );
}
