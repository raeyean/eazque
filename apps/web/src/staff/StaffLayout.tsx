import { NavLink, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";
import "./staff.css";

const NAV_ITEMS = [
  { to: "/staff/queue", label: "Queue" },
  { to: "/staff/history", label: "History" },
  { to: "/staff/analytics", label: "Analytics" },
  { to: "/staff/settings", label: "Settings" },
  { to: "/staff/staff", label: "Staff" },
];

export default function StaffLayout() {
  const { staffProfile, signOut } = useStaffAuth();

  return (
    <div className="staff-layout">
      <nav className="staff-sidebar">
        <div className="staff-sidebar-logo">Eazque</div>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "staff-nav-link" + (isActive ? " active" : "")
            }
          >
            {label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem" }}>
          {staffProfile && (
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              {staffProfile.name}
            </div>
          )}
          <button className="staff-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="staff-main">
        <Outlet />
      </main>

      <nav className="staff-bottom-tabs">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "staff-nav-link" + (isActive ? " active" : "")
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
