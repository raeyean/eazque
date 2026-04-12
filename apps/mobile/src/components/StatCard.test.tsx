import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders label and numeric value", () => {
    render(<StatCard label="Total Served" value={42} />);
    expect(screen.getByText("Total Served")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders value with unit when unit provided", () => {
    render(<StatCard label="Avg Wait" value={4.2} unit="min" />);
    expect(screen.getByText("4.2 min")).toBeTruthy();
  });

  it("renders value without unit when unit not provided", () => {
    render(<StatCard label="Skip Rate" value="32%" />);
    expect(screen.getByText("32%")).toBeTruthy();
  });

  it("renders string value", () => {
    render(<StatCard label="Remove Rate" value="1.5%" />);
    expect(screen.getByText("1.5%")).toBeTruthy();
  });
});
