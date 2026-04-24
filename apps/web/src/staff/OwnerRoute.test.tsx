import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OwnerRoute from "./OwnerRoute";

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

describe("OwnerRoute", () => {
  it("renders outlet for owner", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: { uid: "u1" } as any,
      businessId: "b1",
      staffProfile: { name: "Alice", email: "a@b.com", role: "owner", status: "active" },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
    render(<OwnerRoute />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("redirects non-owner staff to /staff/queue", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: { uid: "u2" } as any,
      businessId: "b1",
      staffProfile: { name: "Bob", email: "b@b.com", role: "staff", status: "active" },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
    render(<OwnerRoute />);
    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/staff/queue");
  });

  it("renders nothing while loading", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
    const { container } = render(<OwnerRoute />);
    expect(container).toBeEmptyDOMElement();
  });

  it("redirects when staffProfile is null", () => {
    vi.mocked(useStaffAuth).mockReturnValue({
      user: { uid: "u3" } as any,
      businessId: null,
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
    render(<OwnerRoute />);
    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/staff/queue");
  });
});
