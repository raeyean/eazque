import { describe, it, expect } from "vitest";
import {
  createQueueEntryData,
  calculateNewAverage,
  findApproachingEntries,
  buildQueueResetData,
} from "../src/queue-logic";

describe("createQueueEntryData", () => {
  it("creates entry with correct queue number and display number", () => {
    const entry = createQueueEntryData(
      1,
      "John Doe",
      "+60123456789",
      {},
      "session-abc-123"
    );

    expect(entry.queueNumber).toBe(1);
    expect(entry.displayNumber).toBe("Q-001");
    expect(entry.status).toBe("waiting");
    expect(entry.customerName).toBe("John Doe");
    expect(entry.phone).toBe("+60123456789");
    expect(entry.sessionToken).toBe("session-abc-123");
    expect(entry.servedAt).toBeNull();
    expect(entry.completedAt).toBeNull();
    expect(entry.notes).toBe("");
  });

  it("formats multi-digit queue numbers correctly", () => {
    const entry = createQueueEntryData(42, "Jane", "+1", {}, "t");
    expect(entry.displayNumber).toBe("Q-042");
  });

  it("formats queue numbers beyond 3 digits", () => {
    const entry = createQueueEntryData(1234, "Test", "+1", {}, "t");
    expect(entry.displayNumber).toBe("Q-1234");
  });

  it("preserves form data", () => {
    const formData = { field1: "value1", field2: 42, field3: true };
    const entry = createQueueEntryData(1, "Test", "+1", formData, "t");
    expect(entry.formData).toEqual(formData);
  });
});

describe("calculateNewAverage", () => {
  it("returns duration as average for first completion", () => {
    const result = calculateNewAverage(0, 0, 5);
    expect(result.newAvg).toBe(5);
    expect(result.newCount).toBe(1);
  });

  it("calculates weighted average for subsequent completions", () => {
    // (10 * 4 + 5) / 5 = 45 / 5 = 9
    const result = calculateNewAverage(10, 4, 5);
    expect(result.newAvg).toBe(9);
    expect(result.newCount).toBe(5);
  });

  it("caps count at rolling window size of 20", () => {
    // effectiveCount = min(20, 20) = 20
    // (10 * 20 + 30) / 21 = 230 / 21 ≈ 10.95
    const result = calculateNewAverage(10, 20, 30);
    expect(result.newAvg).toBeCloseTo(10.95, 1);
    expect(result.newCount).toBe(20);
  });

  it("handles zero duration service", () => {
    // (10 * 5 + 0) / 6 = 50 / 6 ≈ 8.33
    const result = calculateNewAverage(10, 5, 0);
    expect(result.newAvg).toBeCloseTo(8.33, 1);
    expect(result.newCount).toBe(6);
  });

  it("handles count already beyond window", () => {
    // Same as at window — effectiveCount capped at 20
    const result = calculateNewAverage(10, 25, 10);
    expect(result.newAvg).toBe(10);
    expect(result.newCount).toBe(20);
  });
});

describe("findApproachingEntries", () => {
  const entries = [
    { queueNumber: 3, phone: "+1" },
    { queueNumber: 5, phone: "+2" },
    { queueNumber: 6, phone: "+3" },
    { queueNumber: 7, phone: "+4" },
    { queueNumber: 10, phone: "+5" },
  ];

  it("returns entries within threshold of current number", () => {
    // currentNumber = 4, threshold = 3 → entries with queueNumber 5, 6, 7
    const result = findApproachingEntries(4, 3, entries);
    expect(result).toEqual([
      { queueNumber: 5, phone: "+2" },
      { queueNumber: 6, phone: "+3" },
      { queueNumber: 7, phone: "+4" },
    ]);
  });

  it("excludes entries at or below current number", () => {
    const result = findApproachingEntries(5, 2, entries);
    expect(result).toEqual([
      { queueNumber: 6, phone: "+3" },
      { queueNumber: 7, phone: "+4" },
    ]);
  });

  it("returns empty array when no entries are approaching", () => {
    const result = findApproachingEntries(10, 3, entries);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty entries list", () => {
    const result = findApproachingEntries(1, 3, []);
    expect(result).toEqual([]);
  });
});

describe("buildQueueResetData", () => {
  it("returns correct reset values with date", () => {
    const result = buildQueueResetData("2026-04-05");
    expect(result).toEqual({
      currentNumber: 0,
      nextNumber: 1,
      completedCount: 0,
      avgServiceTime: 0,
      date: "2026-04-05",
    });
  });
});
