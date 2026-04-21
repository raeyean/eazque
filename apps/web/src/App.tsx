import { Routes, Route, Navigate } from "react-router-dom";
import JoinQueuePage from "./pages/JoinQueuePage";
import QueueStatusPage from "./pages/QueueStatusPage";
import { StaffAuthProvider } from "./staff/StaffAuthContext";
import StaffRoute from "./staff/StaffRoute";
import StaffLayout from "./staff/StaffLayout";
import LoginPage from "./staff/pages/LoginPage";
import SignUpPage from "./staff/pages/SignUpPage";
import QueuePage from "./staff/pages/QueuePage";
import HistoryPage from "./staff/pages/HistoryPage";
import AnalyticsPage from "./staff/pages/AnalyticsPage";
import SettingsPage from "./staff/pages/SettingsPage";
import StaffPage from "./staff/pages/StaffPage";

export default function App() {
  return (
    <StaffAuthProvider>
      <Routes>
        {/* Customer routes */}
        <Route path="/q/:businessId" element={<JoinQueuePage />} />
        <Route
          path="/q/:businessId/status/:sessionToken"
          element={<QueueStatusPage />}
        />

        {/* Staff routes */}
        <Route path="/staff/login" element={<LoginPage />} />
        <Route path="/staff/signup" element={<SignUpPage />} />
        <Route element={<StaffRoute />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff/queue" element={<QueuePage />} />
            <Route path="/staff/history" element={<HistoryPage />} />
            <Route path="/staff/analytics" element={<AnalyticsPage />} />
            <Route path="/staff/settings" element={<SettingsPage />} />
            <Route path="/staff/staff" element={<StaffPage />} />
            <Route
              path="/staff"
              element={<Navigate to="/staff/queue" replace />}
            />
          </Route>
        </Route>
      </Routes>
    </StaffAuthProvider>
  );
}
