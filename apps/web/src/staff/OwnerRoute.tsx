import { Navigate, Outlet } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";

export default function OwnerRoute() {
  const { staffProfile, loading } = useStaffAuth();
  if (loading) return null;
  if (staffProfile?.role !== "owner") return <Navigate to="/staff/queue" replace />;
  return <Outlet />;
}
