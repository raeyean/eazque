import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import QueueStats from "./QueueStats";

describe("QueueStats", () => {
  it("displays waiting count", () => {
    render(<QueueStats waitingCount={12} avgServiceTime={5} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Waiting")).toBeTruthy();
  });

  it("displays average service time in minutes", () => {
    render(<QueueStats waitingCount={0} avgServiceTime={8} />);
    expect(screen.getByText("8 min")).toBeTruthy();
    expect(screen.getByText("Avg Time")).toBeTruthy();
  });

  it("shows 0 for both when no data", () => {
    render(<QueueStats waitingCount={0} avgServiceTime={0} />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("0 min")).toBeTruthy();
  });
});
