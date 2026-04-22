import { doc, writeBatch, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueEntry } from "@eazque/shared";

function entryRef(businessId: string, queueId: string, entryId: string) {
  return doc(db, `businesses/${businessId}/queues/${queueId}/entries/${entryId}`);
}

function queueRef(businessId: string, queueId: string) {
  return doc(db, `businesses/${businessId}/queues/${queueId}`);
}

export async function advanceQueue(
  businessId: string,
  queueId: string,
  waitingEntries: QueueEntry[],
  servingEntryId: string | null
) {
  if (waitingEntries.length === 0) return;
  const batch = writeBatch(db);
  const nextEntry = waitingEntries[0];

  if (servingEntryId) {
    batch.update(entryRef(businessId, queueId, servingEntryId), {
      status: "completed",
      completedAt: serverTimestamp(),
    });
  }
  batch.update(entryRef(businessId, queueId, nextEntry.id), {
    status: "serving",
    servedAt: serverTimestamp(),
  });
  batch.update(queueRef(businessId, queueId), {
    currentNumber: nextEntry.queueNumber,
  });
  await batch.commit();
}

export async function skipEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { status: "skipped" });
}

export async function removeEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { status: "removed" });
}

export async function addNote(
  businessId: string,
  queueId: string,
  entryId: string,
  note: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), { notes: note });
}

export async function setQueueStatus(
  businessId: string,
  queueId: string,
  status: "active" | "paused"
) {
  await updateDoc(queueRef(businessId, queueId), { status });
}
