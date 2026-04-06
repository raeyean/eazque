import { estimateWaitMinutes, formatDisplayNumber } from "@eazque/shared";

interface QueuePositionProps {
  myDisplayNumber: string;
  myQueueNumber: number;
  currentNumber: number;
  avgServiceTime: number;
  completedCount: number;
  defaultEstimatedTime: number;
  myStatus: string;
}

export default function QueuePosition({
  myDisplayNumber,
  myQueueNumber,
  currentNumber,
  avgServiceTime,
  completedCount,
  defaultEstimatedTime,
  myStatus,
}: QueuePositionProps) {
  const positionInQueue = myQueueNumber - currentNumber;
  const waitMinutes = estimateWaitMinutes({
    positionInQueue,
    avgServiceTime,
    completedCount,
    defaultEstimatedTime,
  });

  const isMyTurn = myStatus === "serving" || positionInQueue <= 0;

  return (
    <div className="queue-position">
      <div className="my-number">{myDisplayNumber}</div>
      {isMyTurn ? (
        <div className="your-turn">It's your turn!</div>
      ) : (
        <>
          <div className="serving-info">
            Now serving: <strong>{formatDisplayNumber(currentNumber)}</strong>
          </div>
          <div className="ahead-count">{positionInQueue} ahead of you</div>
          <div className="wait-time">~{waitMinutes} min wait</div>
        </>
      )}
    </div>
  );
}
