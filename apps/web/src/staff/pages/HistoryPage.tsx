import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueueByDate } from "../hooks/useQueueByDate";
import { useHistoryEntries } from "../hooks/useHistoryEntries";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HistoryPage() {
  const { businessId } = useStaffAuth();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const { queueId, loading: queueLoading } = useQueueByDate(
    businessId!,
    selectedDate
  );
  const { entries, loading: entriesLoading } = useHistoryEntries(
    businessId!,
    queueId
  );

  const loading = queueLoading || entriesLoading;
  const completedCount = entries.filter((e) => e.status === "completed").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  return (
    <div className="staff-page">
      <h1>History</h1>
      <div className="staff-date-nav">
        <label htmlFor="date-picker">Date</label>
        <input
          id="date-picker"
          type="date"
          value={selectedDate}
          max={getToday()}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading history...</div>
      ) : !queueId ? (
        <div className="loading">No queue for this date.</div>
      ) : (
        <>
          <div className="staff-history-summary">
            {completedCount} completed · {skippedCount} skipped · {removedCount} removed
          </div>
          <div>
            {entries.map((entry) => (
              <div key={entry.id} className="staff-history-entry">
                <div className="staff-history-entry-left">
                  <span className="staff-history-number">
                    {entry.displayNumber}
                  </span>
                  <span>{entry.customerName}</span>
                </div>
                <span
                  className={`staff-history-status ${entry.status}`}
                >
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
