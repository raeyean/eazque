import type { QueueEntryPublic } from "@eazque/shared";

interface QueueListProps {
  entries: QueueEntryPublic[];
  myQueueNumber: number;
}

export default function QueueList({ entries, myQueueNumber }: QueueListProps) {
  if (entries.length === 0) return null;

  return (
    <div className="queue-list">
      <h3>Queue</h3>
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`queue-entry${entry.queueNumber === myQueueNumber ? " my-entry" : ""}${entry.status === "serving" ? " serving" : ""}`}
          >
            <span className="entry-number">{entry.displayNumber}</span>
            <span className="entry-status">
              {entry.status === "serving" ? "Serving" : "Waiting"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
