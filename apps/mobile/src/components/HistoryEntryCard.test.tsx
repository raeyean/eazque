import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import HistoryEntryCard from "./HistoryEntryCard";
import type { QueueEntry } from "@eazque/shared";

const baseEntry: QueueEntry = {
  id: "e1",
  queueNumber: 1,
  displayNumber: "A001",
  status: "completed",
  customerName: "Alice",
  phone: "+60123456789",
  formData: {},
  notes: "",
  sessionToken: "tok1",
  joinedAt: new Date("2026-04-08T09:30:00"),
  servedAt: new Date("2026-04-08T09:45:00"),
  completedAt: new Date("2026-04-08T09:50:00"),
};

describe("HistoryEntryCard", () => {
  it("displays display number and customer name", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText("A001")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("displays formatted join time", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText(/9:30/)).toBeTruthy();
  });

  it("displays Completed badge for completed status", () => {
    render(<HistoryEntryCard entry={baseEntry} />);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("displays Skipped badge for skipped status", () => {
    const skipped: QueueEntry = { ...baseEntry, status: "skipped" };
    render(<HistoryEntryCard entry={skipped} />);
    expect(screen.getByText("Skipped")).toBeTruthy();
  });

  it("displays Removed badge for removed status", () => {
    const removed: QueueEntry = { ...baseEntry, status: "removed" };
    render(<HistoryEntryCard entry={removed} />);
    expect(screen.getByText("Removed")).toBeTruthy();
  });
});
