import { useParams, useLocation } from "react-router-dom";
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

export default function QueueStatusPage() {
  const { businessId, sessionToken } = useParams<{
    businessId: string;
    sessionToken: string;
  }>();
  const location = useLocation();
  const navState = (location.state ?? {}) as NavigationState;

  const { business, loading: bizLoading } = useBusinessData(businessId!);
  const { queue, queueId, loading: queueLoading } = useActiveQueue(
    businessId!
  );
  const { entry, loading: entryLoading } = useMyEntry(
    businessId!,
    queueId,
    sessionToken!
  );
  const { entries } = useQueueEntries(businessId!, queueId);

  const loading = bizLoading || queueLoading || entryLoading;

  if (loading && !navState.displayNumber) {
    return <div className="loading">Loading your queue status...</div>;
  }

  const displayNumber =
    entry?.displayNumber ?? navState.displayNumber ?? "...";
  const queueNumber = entry?.queueNumber ?? navState.queueNumber ?? 0;
  const currentNumber =
    queue?.currentNumber ?? navState.currentNumber ?? 0;
  const myStatus = entry?.status ?? "waiting";
  const whatsappNumber =
    business?.whatsappNumber ?? navState.whatsappNumber ?? "";
  const businessName = business?.name ?? navState.businessName ?? "";
  const primaryColor =
    business?.primaryColor ?? navState.primaryColor ?? "#B8926A";
  const defaultEstimatedTime = 10;

  return (
    <div
      className="page-container"
      style={{ "--color-primary": primaryColor } as React.CSSProperties}
    >
      <h1>{businessName}</h1>
      <QueuePosition
        myDisplayNumber={displayNumber}
        myQueueNumber={queueNumber}
        currentNumber={currentNumber}
        avgServiceTime={queue?.avgServiceTime ?? 0}
        completedCount={queue?.completedCount ?? 0}
        defaultEstimatedTime={defaultEstimatedTime}
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
    </div>
  );
}
