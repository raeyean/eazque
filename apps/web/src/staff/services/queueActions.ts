import { doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
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
  const nextEntry = waitingEntries[0];

  await runTransaction(db, async (txn) => {
    const nextSnap = await txn.get(entryRef(businessId, queueId, nextEntry.id));
    if (!nextSnap.exists() || nextSnap.data()?.status !== "waiting") return;

    if (servingEntryId) {
      const servingSnap = await txn.get(entryRef(businessId, queueId, servingEntryId));
      if (servingSnap.exists() && servingSnap.data()?.status === "serving") {
        txn.update(entryRef(businessId, queueId, servingEntryId), {
          status: "completed",
          completedAt: serverTimestamp(),
        });
      }
    }

    txn.update(entryRef(businessId, queueId, nextEntry.id), {
      status: "serving",
      servedAt: serverTimestamp(),
    });
    txn.update(queueRef(businessId, queueId), {
      currentNumber: nextEntry.queueNumber,
    });
  });
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
