import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import StaffRoute from "./StaffRoute";
import * as Auth from "./StaffAuthContext";

const mockUseStaffAuth = vi.spyOn(Auth, "useStaffAuth");

describe("StaffRoute", () => {
  it("redirects to /staff/login when not authenticated", () => {
    mockUseStaffAuth.mockReturnValue({
      user: null,
      businessId: null,
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <Routes>
          <Route path="/staff/login" element={<div>Login</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff/queue" element={<div>Queue</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseStaffAuth.mockReturnValue({
      user: { uid: "u1" } as any,
      businessId: "b1",
      staffProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <Routes>
          <Route path="/staff/login" element={<div>Login</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff/queue" element={<div>Queue</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Queue")).toBeInTheDocument();
  });
});
