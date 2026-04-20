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
    // 5 - 2 - 1 = 2 ahead (Q-003, Q-004)
    expect(screen.getByText(/2 ahead of you/)).toBeInTheDocument();
  });

  it("shows estimated wait time", () => {
    render(<QueuePosition {...defaultProps} />);
    // 2 * 10 = 20 min (data-driven, completedCount >= 5)
    expect(screen.getByText(/20 min wait/)).toBeInTheDocument();
  });

  it("shows your turn message when status is serving", () => {
    render(<QueuePosition {...defaultProps} myStatus="serving" />);
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  it("shows served message when status is completed", () => {
    render(<QueuePosition {...defaultProps} myStatus="completed" />);
    expect(screen.getByText(/you've been served/i)).toBeInTheDocument();
  });

  it("shows skipped message when status is skipped", () => {
    render(<QueuePosition {...defaultProps} myStatus="skipped" />);
    expect(screen.getByText(/you were skipped/i)).toBeInTheDocument();
  });

  it("shows removed message when status is removed", () => {
    render(<QueuePosition {...defaultProps} myStatus="removed" />);
    expect(screen.getByText(/you've been removed/i)).toBeInTheDocument();
  });
});
