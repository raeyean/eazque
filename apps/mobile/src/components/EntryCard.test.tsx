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

  it("renders form data with field labels when formFields provided", () => {
    const formFields = [
      { id: "f1", type: "text" as const, label: "Service", required: false },
      { id: "f2", type: "text" as const, label: "Allergies", required: false },
    ];
    const entryWithFormData = { ...mockEntry, formData: { f1: "Haircut", f2: "" } };
    render(
      <EntryCard
        entry={entryWithFormData}
        formFields={formFields}
        onSkip={noop}
        onRemove={noop}
        onAddNote={noop}
      />
    );
    expect(screen.getByText(/Service: Haircut/)).toBeTruthy();
    // empty value should not render
    expect(screen.queryByText(/Allergies/)).toBeNull();
  });

  it("renders nothing for formData when no formFields provided", () => {
    const entryWithFormData = { ...mockEntry, formData: { f1: "Haircut" } };
    const { toJSON } = render(
      <EntryCard entry={entryWithFormData} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain("Haircut");
  });
});
