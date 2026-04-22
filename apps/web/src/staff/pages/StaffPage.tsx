import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useStaff } from "../hooks/useStaff";
import { createStaffAccount, removeStaffAccount } from "../services/staffActions";

export default function StaffPage() {
  const { businessId, user } = useStaffAuth();
  const { staff, loading } = useStaff(businessId!);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;

    setFormError(null);
    if (!name || !email || !password) {
      setFormError("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (staff.some((s) => s.email === email)) {
      setFormError("A staff member with this email already exists.");
      return;
    }

    setAdding(true);
    try {
      await createStaffAccount(businessId!, name, email, password);
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } catch {
      setFormError("Failed to add staff member. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!pendingRemoveId) return;
    setRemoveError(null);
    try {
      await removeStaffAccount(businessId!, pendingRemoveId);
    } catch {
      setRemoveError("Failed to remove staff member. Please try again.");
    } finally {
      setPendingRemoveId(null);
    }
  };

  if (loading) return <div className="loading">Loading staff...</div>;

  return (
    <div className="staff-page">
      <h1>Staff</h1>

      {removeError && <div className="error-message">{removeError}</div>}

      <div className="staff-member-list">
        {staff.map((member) => (
          <div key={member.id} className="staff-member-card">
            <div className="staff-member-info">
              <div className="staff-member-name">{member.name}</div>
              <div className="staff-member-email">{member.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="staff-member-role">{member.role}</span>
              {member.id !== user?.uid && (
                pendingRemoveId === member.id ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#c0392b" }}>Remove?</span>
                    <button
                      className="staff-btn staff-btn-danger"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                      onClick={handleRemoveConfirm}
                    >
                      Yes
                    </button>
                    <button
                      style={{ background: "none", border: "1px solid #d4b896", padding: "0.35rem 0.75rem", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" }}
                      onClick={() => setPendingRemoveId(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="staff-btn staff-btn-danger"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                    onClick={() => { setRemoveError(null); setPendingRemoveId(member.id); }}
                  >
                    Remove
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {!showAddForm ? (
        <button className="staff-btn" onClick={() => setShowAddForm(true)}>
          + Add Staff Member
        </button>
      ) : (
        <form className="staff-inline-form" onSubmit={handleAdd}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Add Staff Member</div>
          <div className="staff-form">
            <div>
              <label htmlFor="staff-name">Name</label>
              <input
                id="staff-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            {formError && <div className="error-message">{formError}</div>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="staff-btn" type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setFormError(null); }}
                style={{ background: "none", border: "1px solid #d4b896", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
