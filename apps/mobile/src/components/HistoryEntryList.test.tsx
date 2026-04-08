import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import HistoryEntryList from "./HistoryEntryList";
import type { QueueEntry } from "@eazque/shared";

const mockEntries: QueueEntry[] = [
  {
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
  },
  {
    id: "e2",
    queueNumber: 2,
    displayNumber: "A002",
    status: "skipped",
    customerName: "Bob",
    phone: "+60198765432",
    formData: {},
    notes: "",
    sessionToken: "tok2",
    joinedAt: new Date("2026-04-08T09:35:00"),
    servedAt: null,
    completedAt: null,
  },
];

describe("HistoryEntryList", () => {
  it("renders entry cards", () => {
    render(<HistoryEntryList entries={mockEntries} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(<HistoryEntryList entries={[]} />);
    expect(screen.getByText("No entries for this date")).toBeTruthy();
  });
});
