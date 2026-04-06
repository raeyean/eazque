import { Routes, Route } from "react-router-dom";
import JoinQueuePage from "./pages/JoinQueuePage";
import QueueStatusPage from "./pages/QueueStatusPage";

export default function App() {
  return (
    <Routes>
      <Route path="/q/:businessId" element={<JoinQueuePage />} />
      <Route
        path="/q/:businessId/status/:sessionToken"
        element={<QueueStatusPage />}
      />
    </Routes>
  );
}
