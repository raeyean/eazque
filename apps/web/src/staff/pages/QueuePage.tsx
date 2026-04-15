import { useState } from "react";
import { useStaffAuth } from "../StaffAuthContext";
import { useQueue } from "../hooks/useQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import { advanceQueue, skipEntry, removeEntry, addNote } from "../services/queueActions";
import { formatDisplayNumber } from "@eazque/shared";

export default function QueuePage() {
  const { businessId } = useStaffAuth();
  const { queue, queueId, loading: queueLoading } = useQueue(businessId!);
  const { entries, loading: entriesLoading } = useQueueEntries(
    businessId!,
    queueId
  );
  const [advancing, setAdvancing] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const servingEntry = entries.find((e) => e.status === "serving");

  const handleNext = async () => {
    if (!queueId || waitingEntries.length === 0) return;
    setAdvancing(true);
    try {
      await advanceQueue(
        businessId!,
        queueId,
        waitingEntries,
        servingEntry?.id ?? null
      );
    } catch {
      alert("Failed to advance queue. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleSkip = (entryId: string) => {
    if (confirm("Move this customer to skipped?")) {
      skipEntry(businessId!, queueId!, entryId);
    }
  };

  const handleRemove = (entryId: string) => {
    if (confirm("Remove this customer from the queue?")) {
      removeEntry(businessId!, queueId!, entryId);
    }
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
      <div className="staff-now-serving">
        <span className="staff-now-serving-label">Now serving</span>
        <span className="staff-now-serving-number">
          {formatDisplayNumber(queue.currentNumber)}
        </span>
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
              <button onClick={() => handleSkip(entry.id)}>Skip</button>
              <button onClick={() => handleRemove(entry.id)}>Remove</button>
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
    </div>
  );
}
