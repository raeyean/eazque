import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { DEFAULT_ESTIMATED_TIME_PER_CUSTOMER } from "@eazque/shared";
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
}

function QueueContent({ businessId, sessionToken, navState }: QueueContentProps) {
  const { business, loading: bizLoading } = useBusinessData(businessId);
  const { queue, queueId, loading: queueLoading } = useActiveQueue(businessId);
  const { entry, loading: entryLoading } = useMyEntry(businessId, queueId, sessionToken);
  const { entries } = useQueueEntries(businessId, queueId);

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

  return (
    <>
      <QueuePosition
        myDisplayNumber={displayNumber}
        myQueueNumber={queueNumber}
        currentNumber={currentNumber}
        avgServiceTime={queue?.avgServiceTime ?? 0}
        completedCount={queue?.completedCount ?? 0}
        defaultEstimatedTime={DEFAULT_ESTIMATED_TIME_PER_CUSTOMER}
        myStatus={myStatus}
      />
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

  const businessName = navState.businessName ?? "";
  const primaryColor = navState.primaryColor ?? "#B8926A";

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
      />
    </div>
  );
}
