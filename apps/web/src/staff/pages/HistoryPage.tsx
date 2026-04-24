import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueueByDate } from "../hooks/useQueueByDate";
import { useHistoryEntries } from "../hooks/useHistoryEntries";
import { localDateString } from "@eazque/shared";
import type { QueueEntry } from "@eazque/shared";

function getToday(): string {
  return localDateString();
}

type StatusFilter = "all" | "completed" | "skipped" | "removed";

function formatDateCell(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function exportCsv(entries: QueueEntry[], date: string) {
  const header = ["#", "Name", "Phone", "Status", "Notes", "Joined At", "Served At", "Completed At"];
  const rows = entries.map((e) => [
    e.displayNumber,
    e.customerName,
    e.phone ?? "",
    e.status,
    e.notes ?? "",
    formatDateCell(e.joinedAt),
    e.servedAt ? formatDateCell(e.servedAt) : "",
    e.completedAt ? formatDateCell(e.completedAt) : "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `history-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const { businessId } = useStaffAuth();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { queueId, loading: queueLoading } = useQueueByDate(businessId!, selectedDate);
  const { entries, loading: entriesLoading, capped } = useHistoryEntries(businessId!, queueId);

  const loading = queueLoading || entriesLoading;

  const filtered = entries
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) => !search.trim() || e.customerName.toLowerCase().includes(search.trim().toLowerCase()));

  const completedCount = entries.filter((e) => e.status === "completed").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "skipped", label: "Skipped" },
    { key: "removed", label: "Removed" },
  ];

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

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", border: "1px solid #d4b896", borderRadius: 8, background: "#f5ede3", fontSize: "0.9rem", color: "#5a4430", flex: "1 1 160px", minWidth: 0 }}
            />
            <button
              onClick={() => exportCsv(filtered, selectedDate)}
              disabled={filtered.length === 0}
              className="staff-btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              Export CSV
            </button>
          </div>

          <div className="staff-range-tabs" style={{ marginBottom: "0.75rem" }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`staff-range-tab${statusFilter === tab.key ? " active" : ""}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {capped && (
            <div style={{ fontSize: "0.8rem", color: "#8b6f47", marginBottom: "0.5rem" }}>
              Showing first 200 entries. Use Export CSV for full history.
            </div>
          )}

          <div>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", color: "#8b6f47", padding: "2rem 0", fontStyle: "italic" }}>
                No entries match your search.
              </div>
            )}
            {filtered.map((entry) => (
              <div key={entry.id} className="staff-history-entry">
                <div className="staff-history-entry-left">
                  <span className="staff-history-number">{entry.displayNumber}</span>
                  <span>{entry.customerName}</span>
                </div>
                <span className={`staff-history-status ${entry.status}`}>
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
