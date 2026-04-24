import { NavLink, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";
import "./staff.css";

const ALL_NAV_ITEMS = [
  { to: "/staff/queue", label: "Queue", ownerOnly: false },
  { to: "/staff/history", label: "History", ownerOnly: false },
  { to: "/staff/analytics", label: "Analytics", ownerOnly: false },
  { to: "/staff/settings", label: "Settings", ownerOnly: true },
  { to: "/staff/staff", label: "Staff", ownerOnly: true },
];

export default function StaffLayout() {
  const { staffProfile, signOut } = useStaffAuth();
  const isOwner = staffProfile?.role === "owner";
  const navItems = ALL_NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="staff-layout">
      <nav className="staff-sidebar">
        <div className="staff-sidebar-logo">Eazque</div>
        {navItems.map(({ to, label }) => (
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
        {navItems.map(({ to, label }) => (
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
