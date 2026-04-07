import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import NowServing from "./NowServing";

describe("NowServing", () => {
  it("displays the formatted queue number when serving", () => {
    render(<NowServing currentNumber={5} />);
    expect(screen.getByText("Q-005")).toBeTruthy();
  });

  it("shows 'Now Serving' label when someone is being served", () => {
    render(<NowServing currentNumber={12} />);
    expect(screen.getByText("Now Serving")).toBeTruthy();
    expect(screen.getByText("Q-012")).toBeTruthy();
  });

  it("shows empty state when currentNumber is 0", () => {
    render(<NowServing currentNumber={0} />);
    expect(screen.getByText("No one serving")).toBeTruthy();
  });
});
