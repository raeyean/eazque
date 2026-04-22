import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueue } from "../hooks/useQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import { advanceQueue, skipEntry, removeEntry, addNote, setQueueStatus } from "../services/queueActions";
import { formatDisplayNumber } from "@eazque/shared";

type PendingAction = { type: "skip" | "remove"; entryId: string; label: string };

export default function QueuePage() {
  const { businessId } = useStaffAuth();
  const { queue, queueId, loading: queueLoading } = useQueue(businessId!);
  const { entries, loading: entriesLoading } = useQueueEntries(
    businessId!,
    queueId
  );
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const handleTogglePause = async () => {
    if (!queueId) return;
    setToggling(true);
    try {
      await setQueueStatus(businessId!, queueId, queue!.status === "active" ? "paused" : "active");
    } finally {
      setToggling(false);
    }
  };
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const servingEntry = entries.find((e) => e.status === "serving");

  const handleNext = async () => {
    if (!queueId || waitingEntries.length === 0) return;
    setAdvancing(true);
    setAdvanceError(null);
    try {
      await advanceQueue(
        businessId!,
        queueId,
        waitingEntries,
        servingEntry?.id ?? null
      );
    } catch {
      setAdvanceError("Failed to advance queue. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handlePendingConfirm = () => {
    if (!pendingAction || !queueId) return;
    if (pendingAction.type === "skip") {
      skipEntry(businessId!, queueId, pendingAction.entryId);
    } else {
      removeEntry(businessId!, queueId, pendingAction.entryId);
    }
    setPendingAction(null);
  };

  const handleSaveNote = async () => {
    if (!noteEntryId || !queueId) return;
    await addNote(businessId!, queueId, noteEntryId, noteText.trim());
    setNoteEntryId(null);
    setNoteText("");
  };

  if (queueLoading || entriesLoading)
    return <div className="loading">Loading queue...</div>;
  if (!queue || !queueId)
    return <div className="error">No queue found</div>;

  return (
    <div className="staff-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <div className="staff-now-serving" style={{ marginBottom: 0 }}>
          <span className="staff-now-serving-label">Now serving</span>
          <span className="staff-now-serving-number">
            {formatDisplayNumber(queue.currentNumber)}
          </span>
        </div>
        <a
          href={`/display/${businessId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "#b8926a", textDecoration: "none", whiteSpace: "nowrap" }}
          title="Open public display for TV/kiosk"
        >
          ⬡ Display ↗
        </a>
      </div>
      <div className="staff-queue-stats">
        {waitingEntries.length} waiting
      </div>
      <button
        className="staff-next-button"
        onClick={handleNext}
        disabled={advancing || waitingEntries.length === 0}
      >
        {advancing ? "Advancing..." : "Next →"}
      </button>
      {advanceError && <div className="error-message" style={{ marginTop: "0.5rem" }}>{advanceError}</div>}

      <button
        onClick={handleTogglePause}
        disabled={toggling}
        style={{
          background: "none",
          border: `1px solid ${queue.status === "paused" ? "#4caf50" : "#f0a500"}`,
          color: queue.status === "paused" ? "#4caf50" : "#f0a500",
          padding: "0.4rem 1.25rem",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          marginTop: "0.5rem",
        }}
      >
        {toggling ? "..." : queue.status === "paused" ? "▶ Resume Queue" : "⏸ Pause Queue"}
      </button>

      {queue.status === "paused" && (
        <div style={{ background: "#fff8e1", border: "1px solid #f0a500", borderRadius: 8, padding: "0.6rem 1rem", fontSize: "0.85rem", color: "#7a5800", marginTop: "0.25rem" }}>
          Queue is paused — customers cannot join until resumed.
        </div>
      )}

      {servingEntry && (
        <div className="staff-serving-banner">
          Now serving: {servingEntry.displayNumber} — {servingEntry.customerName}
        </div>
      )}

      <div className="staff-entry-list">
        {waitingEntries.map((entry) => (
          <div key={entry.id} className="staff-entry-card">
            <div className="staff-entry-header">
              <span className="staff-entry-number">{entry.displayNumber}</span>
              <span className="staff-entry-name">{entry.customerName}</span>
            </div>
            {entry.phone && (
              <div className="staff-entry-phone">{entry.phone}</div>
            )}
            {entry.notes && (
              <div className="staff-entry-notes">Note: {entry.notes}</div>
            )}
            <div className="staff-entry-actions">
              <button onClick={() => setPendingAction({ type: "skip", entryId: entry.id, label: entry.displayNumber })}>Skip</button>
              <button onClick={() => setPendingAction({ type: "remove", entryId: entry.id, label: entry.displayNumber })}>Remove</button>
              <button
                onClick={() => {
                  setNoteText(entry.notes ?? "");
                  setNoteEntryId(entry.id);
                }}
              >
                Note
              </button>
            </div>
          </div>
        ))}
      </div>

      {noteEntryId && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <h3>Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Enter note..."
            />
            <div className="staff-modal-buttons">
              <button
                className="btn-secondary"
                onClick={() => setNoteEntryId(null)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveNote}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <h3>{pendingAction.type === "skip" ? "Skip customer?" : "Remove customer?"}</h3>
            <p style={{ margin: "0.75rem 0" }}>
              {pendingAction.type === "skip"
                ? `Move #${pendingAction.label} to skipped?`
                : `Remove #${pendingAction.label} from the queue?`}
            </p>
            <div className="staff-modal-buttons">
              <button className="btn-secondary" onClick={() => setPendingAction(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handlePendingConfirm}>
                {pendingAction.type === "skip" ? "Skip" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
