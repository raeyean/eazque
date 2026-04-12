import { describe, it, expect } from "vitest";
import { computeDailyStats } from "../src/generate-daily-stats";
import type { QueueEntry } from "@eazque/shared";

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "e1",
    queueNumber: 1,
    displayNumber: "Q-001",
    status: "completed",
    customerName: "Alice",
    phone: "+60123456789",
    formData: {},
    notes: "",
    sessionToken: "tok1",
    joinedAt: new Date("2026-04-12T09:00:00"),
    servedAt: new Date("2026-04-12T09:10:00"),
    completedAt: new Date("2026-04-12T09:15:00"),
    ...overrides,
  };
}

describe("computeDailyStats", () => {
  it("returns zeros and empty distribution for no entries", () => {
    const stats = computeDailyStats("2026-04-12", []);
    expect(stats.date).toBe("2026-04-12");
    expect(stats.totalJoined).toBe(0);
    expect(stats.completedCount).toBe(0);
    expect(stats.skippedCount).toBe(0);
    expect(stats.removedCount).toBe(0);
    expect(stats.avgServiceTime).toBe(0);
    expect(stats.avgWaitTime).toBe(0);
    expect(stats.hourlyDistribution).toEqual({});
  });

  it("counts entries by status correctly", () => {
    const entries = [
      makeEntry({ id: "e1", status: "completed" }),
      makeEntry({ id: "e2", status: "skipped", servedAt: null, completedAt: null }),
      makeEntry({ id: "e3", status: "removed", servedAt: null, completedAt: null }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.totalJoined).toBe(3);
    expect(stats.completedCount).toBe(1);
    expect(stats.skippedCount).toBe(1);
    expect(stats.removedCount).toBe(1);
  });

  it("computes avgWaitTime as mean of (servedAt - joinedAt) for completed entries", () => {
    // entry1: 09:00 joined → 09:10 served = 10 min
    // entry2: 09:00 joined → 09:20 served = 20 min
    // avg = 15 min
    const entries = [
      makeEntry({
        id: "e1",
        joinedAt: new Date("2026-04-12T09:00:00"),
        servedAt: new Date("2026-04-12T09:10:00"),
        completedAt: new Date("2026-04-12T09:12:00"),
      }),
      makeEntry({
        id: "e2",
        joinedAt: new Date("2026-04-12T09:00:00"),
        servedAt: new Date("2026-04-12T09:20:00"),
        completedAt: new Date("2026-04-12T09:22:00"),
      }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.avgWaitTime).toBe(15);
  });

  it("computes avgServiceTime as mean of (completedAt - servedAt) for completed entries", () => {
    // entry1: 09:10 served → 09:15 completed = 5 min
    // entry2: 09:20 served → 09:25 completed = 5 min
    // avg = 5 min
    const entries = [
      makeEntry({
        id: "e1",
        servedAt: new Date("2026-04-12T09:10:00"),
        completedAt: new Date("2026-04-12T09:15:00"),
      }),
      makeEntry({
        id: "e2",
        servedAt: new Date("2026-04-12T09:20:00"),
        completedAt: new Date("2026-04-12T09:25:00"),
      }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.avgServiceTime).toBe(5);
  });

  it("groups entries into hourly distribution by joinedAt hour", () => {
    const entries = [
      makeEntry({ id: "e1", joinedAt: new Date("2026-04-12T09:00:00") }),
      makeEntry({ id: "e2", joinedAt: new Date("2026-04-12T09:30:00"), status: "skipped", servedAt: null, completedAt: null }),
      makeEntry({ id: "e3", joinedAt: new Date("2026-04-12T10:00:00"), status: "skipped", servedAt: null, completedAt: null }),
    ];
    const stats = computeDailyStats("2026-04-12", entries);
    expect(stats.hourlyDistribution["9"]).toBe(2);
    expect(stats.hourlyDistribution["10"]).toBe(1);
    expect(Object.keys(stats.hourlyDistribution)).toHaveLength(2);
  });
});
