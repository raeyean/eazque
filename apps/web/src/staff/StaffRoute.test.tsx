import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./StaffAuthContext");
vi.mock("react-router-dom");

import StaffRoute from "./StaffRoute";
import { useStaffAuth } from "./StaffAuthContext";
import { Navigate, Outlet } from "react-router-dom";

describe("StaffRoute", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when loading", () => {
    (useStaffAuth as any).mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(<StaffRoute />);
    expect(container.firstChild).toBeNull();
  });

  it("returns Navigate to /staff/login when not authenticated", () => {
    (useStaffAuth as any).mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(<StaffRoute />);
    expect(Navigate).toHaveBeenCalledWith(
      { to: "/staff/login", replace: true },
      undefined
    );
  });

  it("returns Outlet when authenticated", () => {
    (useStaffAuth as any).mockReturnValue({
      user: { uid: "u1" },
      businessId: "b1",
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(<StaffRoute />);
    expect(Outlet).toHaveBeenCalled();
  });
});
