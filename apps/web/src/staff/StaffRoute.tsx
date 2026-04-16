import { Navigate, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";

export default function StaffRoute() {
  const { user, loading } = useStaffAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/staff/login" replace />;
  return <Outlet />;
}
