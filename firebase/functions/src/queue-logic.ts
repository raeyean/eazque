import { formatDisplayNumber, ROLLING_AVERAGE_WINDOW } from "@eazque/shared";

export function createQueueEntryData(
  nextNumber: number,
  customerName: string,
  phone: string,
  formData: Record<string, string | number | boolean>,
  sessionToken: string
) {
  return {
    queueNumber: nextNumber,
    displayNumber: formatDisplayNumber(nextNumber),
    status: "waiting" as const,
    customerName,
    phone,
    formData,
    notes: "",
    sessionToken,
    servedAt: null,
    completedAt: null,
  };
}

export interface RollingAverageResult {
  newAvg: number;
  newCount: number;
}

export function calculateNewAverage(
  currentAvg: number,
  completedCount: number,
  serviceDurationMinutes: number
): RollingAverageResult {
  const effectiveCount = Math.min(completedCount, ROLLING_AVERAGE_WINDOW);
  const total = currentAvg * effectiveCount + serviceDurationMinutes;
  const newAvg = Math.round((total / (effectiveCount + 1)) * 100) / 100;
  const newCount = Math.min(completedCount + 1, ROLLING_AVERAGE_WINDOW);
  return { newAvg, newCount };
}

export function findApproachingEntries<
  T extends { queueNumber: number; phone: string },
>(currentNumber: number, threshold: number, waitingEntries: T[]): T[] {
  return waitingEntries.filter(
    (entry) =>
      entry.queueNumber > currentNumber &&
      entry.queueNumber <= currentNumber + threshold
  );
}

export function buildQueueResetData(date: string) {
  return {
    currentNumber: 0,
    nextNumber: 1,
    completedCount: 0,
    avgServiceTime: 0,
    date,
  };
}
