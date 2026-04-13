import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import BusinessAvatar from "./BusinessAvatar";

describe("BusinessAvatar", () => {
  it("renders an image when uri is provided", () => {
    render(
      <BusinessAvatar uri="https://example.com/logo.jpg" name="My Cafe" size={72} />
    );
    expect(screen.getByTestId("business-avatar-image")).toBeTruthy();
    expect(screen.queryByText("MC")).toBeNull();
  });

  it("renders initials when no uri provided", () => {
    render(<BusinessAvatar name="My Cafe" size={72} />);
    expect(screen.queryByTestId("business-avatar-image")).toBeNull();
    expect(screen.getByText("MC")).toBeTruthy();
  });

  it("shows one initial for a single-word name", () => {
    render(<BusinessAvatar name="Cafe" size={72} />);
    expect(screen.getByText("C")).toBeTruthy();
  });

  it("shows two initials for a multi-word name (first two words)", () => {
    render(<BusinessAvatar name="My Awesome Cafe" size={72} />);
    expect(screen.getByText("MA")).toBeTruthy();
  });
});
