import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import QueuePosition from "./QueuePosition";

const defaultProps = {
  myDisplayNumber: "Q-005",
  myQueueNumber: 5,
  currentNumber: 2,
  avgServiceTime: 10,
  completedCount: 10,
  defaultEstimatedTime: 10,
  myStatus: "waiting" as const,
};

describe("QueuePosition", () => {
  it("displays queue number prominently", () => {
    render(<QueuePosition {...defaultProps} />);
    expect(screen.getByText("Q-005")).toBeInTheDocument();
  });

  it("shows currently serving number", () => {
    render(<QueuePosition {...defaultProps} />);
    expect(screen.getByText(/Q-002/)).toBeInTheDocument();
  });

  it("shows people ahead count", () => {
    render(<QueuePosition {...defaultProps} />);
    // 5 - 2 = 3 ahead
    expect(screen.getByText(/3 ahead of you/)).toBeInTheDocument();
  });

  it("shows estimated wait time", () => {
    render(<QueuePosition {...defaultProps} />);
    // 3 * 10 = 30 min (data-driven, completedCount >= 5)
    expect(screen.getByText(/30 min wait/)).toBeInTheDocument();
  });

  it("shows your turn message when status is serving", () => {
    render(<QueuePosition {...defaultProps} myStatus="serving" />);
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });
});
