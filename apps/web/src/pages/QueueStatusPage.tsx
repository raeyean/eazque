import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { DEFAULT_ESTIMATED_TIME_PER_CUSTOMER, PRIMARY_COLOR_DEFAULT } from "@eazque/shared";
import { functions } from "../firebase";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import { useMyEntry } from "../hooks/useMyEntry";
import QueuePosition from "../components/QueuePosition";
import QueueList from "../components/QueueList";
import WhatsAppButton from "../components/WhatsAppButton";

interface NavigationState {
  displayNumber?: string;
  queueNumber?: number;
  currentNumber?: number;
  businessName?: string;
  whatsappNumber?: string;
  primaryColor?: string;
  estimatedWaitMinutes?: number;
}

interface QueueContentProps {
  businessId: string;
  sessionToken: string;
  navState: NavigationState;
  business: ReturnType<typeof useBusinessData>["business"];
  bizLoading: boolean;
}

function QueueContent({ businessId, sessionToken, navState, business, bizLoading }: QueueContentProps) {
  const { queue, queueId, loading: queueLoading } = useActiveQueue(businessId);
  const { entry, loading: entryLoading } = useMyEntry(businessId, queueId, sessionToken);
  const { entries } = useQueueEntries(businessId, queueId);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const loading = bizLoading || queueLoading || entryLoading;

  if (loading && !navState.displayNumber) {
    return <div className="loading">Loading your queue status...</div>;
  }

  if (!loading && !entry && !navState.displayNumber) {
    return <div className="error">Queue entry not found. Your session may have expired.</div>;
  }

  const displayNumber = entry?.displayNumber ?? navState.displayNumber ?? "...";
  const queueNumber = entry?.queueNumber ?? navState.queueNumber ?? 0;
  const currentNumber = queue?.currentNumber ?? navState.currentNumber ?? 0;
  const myStatus = entry?.status ?? "waiting";
  const whatsappNumber = business?.whatsappNumber ?? navState.whatsappNumber ?? "";
  const businessName = business?.name ?? navState.businessName ?? "";

  const handleLeave = async () => {
    if (!queueId) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      const removeSelf = httpsCallable(functions, "customerRemoveSelf");
      await removeSelf({ businessId, queueId, sessionToken });
    } catch {
      setLeaveError("Could not leave the queue. Please try again.");
    } finally {
      setLeaving(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <QueuePosition
        myDisplayNumber={displayNumber}
        myQueueNumber={queueNumber}
        currentNumber={currentNumber}
        avgServiceTime={queue?.avgServiceTime ?? 0}
        completedCount={queue?.completedCount ?? 0}
        defaultEstimatedTime={business?.defaultEstimatedTimePerCustomer ?? DEFAULT_ESTIMATED_TIME_PER_CUSTOMER}
        myStatus={myStatus}
      />
      {myStatus === "waiting" && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{ background: "none", border: "none", color: "var(--color-secondary)", fontSize: "0.9rem", cursor: "pointer", textDecoration: "underline" }}
            >
              Leave queue
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--color-text-dark)" }}>Leave the queue?</span>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={leaving}
                  style={{ padding: "0.4rem 1rem", borderRadius: 8, border: "1px solid var(--color-secondary)", background: "none", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  style={{ padding: "0.4rem 1rem", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}
                >
                  {leaving ? "Leaving..." : "Yes, leave"}
                </button>
              </div>
              {leaveError && <div className="error-message" style={{ marginTop: "0.25rem" }}>{leaveError}</div>}
            </div>
          )}
        </div>
      )}
      {whatsappNumber && (
        <WhatsAppButton
          whatsappNumber={whatsappNumber}
          businessName={businessName}
          displayNumber={displayNumber}
        />
      )}
      <QueueList entries={entries} myQueueNumber={queueNumber} />
    </>
  );
}

export default function QueueStatusPage() {
  const { businessId, sessionToken } = useParams<{
    businessId: string;
    sessionToken: string;
  }>();
  const location = useLocation();
  const navState = (location.state ?? {}) as NavigationState;
  const [refreshKey, setRefreshKey] = useState(0);
  const { business, loading: bizLoading } = useBusinessData(businessId!);

  const businessName = business?.name ?? navState.businessName ?? "";
  const primaryColor = business?.primaryColor ?? navState.primaryColor ?? PRIMARY_COLOR_DEFAULT;

  return (
    <div
      className="page-container"
      style={{ "--color-primary": primaryColor } as React.CSSProperties}
    >
      <div className="page-header">
        <h1>{businessName}</h1>
        <button
          className="refresh-button"
          onClick={() => setRefreshKey((k) => k + 1)}
          aria-label="Refresh queue status"
        >
          ↻
        </button>
      </div>
      <QueueContent
        key={refreshKey}
        businessId={businessId!}
        sessionToken={sessionToken!}
        navState={navState}
        business={business}
        bizLoading={bizLoading}
      />
    </div>
  );
}
