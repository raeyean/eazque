import { render, screen } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import EntryCard from "./EntryCard";
import type { QueueEntry } from "@eazque/shared";

// Mock gesture handler to render children + actions directly
jest.mock("react-native-gesture-handler", () => ({
  Swipeable: ({ children, renderRightActions }: any) => (
    <>
      {children}
      {renderRightActions && renderRightActions()}
    </>
  ),
}));

const mockEntry: QueueEntry = {
  id: "e1",
  queueNumber: 1,
  displayNumber: "Q-001",
  status: "waiting",
  customerName: "John",
  phone: "+601234",
  formData: {},
  notes: "",
  sessionToken: "tok1",
  joinedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
  servedAt: null,
  completedAt: null,
};

const noop = () => {};

describe("EntryCard", () => {
  it("displays customer name and queue number", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("John")).toBeTruthy();
    expect(screen.getByText("Q-001")).toBeTruthy();
  });

  it("displays time since joined", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("10 min")).toBeTruthy();
  });

  it("displays notes when present", () => {
    const entryWithNotes = { ...mockEntry, notes: "VIP customer" };
    render(
      <EntryCard
        entry={entryWithNotes}
        onSkip={noop}
        onRemove={noop}
        onAddNote={noop}
      />
    );
    expect(screen.getByText("VIP customer")).toBeTruthy();
  });

  it("renders swipe action buttons", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("Skip")).toBeTruthy();
    expect(screen.getByText("Remove")).toBeTruthy();
    expect(screen.getByText("Note")).toBeTruthy();
  });
});
