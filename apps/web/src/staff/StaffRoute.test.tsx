import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StaffRoute from "./StaffRoute";

vi.mock("./StaffAuthContext", () => ({
  useStaffAuth: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate" data-to={to} />
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

import { useStaffAuth } from "./StaffAuthContext";

describe("StaffRoute", () => {
  it("redirects to /staff/login when not authenticated", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(<StaffRoute />);
    const nav = screen.getByTestId("navigate");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-to", "/staff/login");
  });

  it("renders children when authenticated", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: { uid: "u1" } as any,
      businessId: "b1",
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(<StaffRoute />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(<StaffRoute />);
    expect(container).toBeEmptyDOMElement();
  });
});
