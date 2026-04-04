import { describe, it, expect } from "vitest";
import { formatDisplayNumber, estimateWaitMinutes } from "../src/utils";

describe("formatDisplayNumber", () => {
  it("pads single digit numbers", () => {
    expect(formatDisplayNumber(1)).toBe("Q-001");
  });

  it("pads double digit numbers", () => {
    expect(formatDisplayNumber(42)).toBe("Q-042");
  });

  it("handles triple digit numbers", () => {
    expect(formatDisplayNumber(123)).toBe("Q-123");
  });

  it("handles numbers above 999", () => {
    expect(formatDisplayNumber(1234)).toBe("Q-1234");
  });

  it("handles zero", () => {
    expect(formatDisplayNumber(0)).toBe("Q-000");
  });
});

describe("estimateWaitMinutes", () => {
  it("uses business default when completedCount < 5", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 4,
      avgServiceTime: 8,
      completedCount: 3,
      defaultEstimatedTime: 10,
    });
    // completedCount (3) < DATA_DRIVEN_THRESHOLD (5), so uses default: 4 * 10 = 40
    expect(result).toBe(40);
  });

  it("uses rolling average when completedCount >= 5", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 4,
      avgServiceTime: 8,
      completedCount: 5,
      defaultEstimatedTime: 10,
    });
    // completedCount (5) >= threshold, so uses avg: 4 * 8 = 32
    expect(result).toBe(32);
  });

  it("returns 0 when position is 0", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 0,
      avgServiceTime: 8,
      completedCount: 10,
      defaultEstimatedTime: 10,
    });
    expect(result).toBe(0);
  });

  it("rounds to nearest integer", () => {
    const result = estimateWaitMinutes({
      positionInQueue: 3,
      avgServiceTime: 7.3,
      completedCount: 10,
      defaultEstimatedTime: 10,
    });
    // 3 * 7.3 = 21.9 → 22
    expect(result).toBe(22);
  });
});
