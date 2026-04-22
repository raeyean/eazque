import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import JoinQueuePage from "./pages/JoinQueuePage";
import QueueStatusPage from "./pages/QueueStatusPage";
import { StaffAuthProvider } from "./staff/StaffAuthContext";
import StaffRoute from "./staff/StaffRoute";
import StaffLayout from "./staff/StaffLayout";
import LoginPage from "./staff/pages/LoginPage";
import SignUpPage from "./staff/pages/SignUpPage";

const QueuePage = lazy(() => import("./staff/pages/QueuePage"));
const HistoryPage = lazy(() => import("./staff/pages/HistoryPage"));
const AnalyticsPage = lazy(() => import("./staff/pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./staff/pages/SettingsPage"));
const StaffPage = lazy(() => import("./staff/pages/StaffPage"));

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
            <Suspense fallback={<div className="loading">Loading...</div>}>
              <Route path="/staff/queue" element={<QueuePage />} />
              <Route path="/staff/history" element={<HistoryPage />} />
              <Route path="/staff/analytics" element={<AnalyticsPage />} />
              <Route path="/staff/settings" element={<SettingsPage />} />
              <Route path="/staff/staff" element={<StaffPage />} />
            </Suspense>
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
