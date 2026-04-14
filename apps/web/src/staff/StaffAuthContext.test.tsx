import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffAuthProvider, useStaffAuth } from "./StaffAuthContext";

let capturedCallback: ((user: any) => void) | null = null;
const mockGetDoc = vi.fn();

vi.mock("../firebase", () => ({ auth: {}, db: {} }));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_: any, cb: any) => {
    capturedCallback = cb;
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: any, ...path: string[]) => path.join("/")),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

function Consumer() {
  const { user, businessId, loading } = useStaffAuth();
  if (loading) return <div>loading</div>;
  return (
    <>
      <span data-testid="uid">{user?.uid ?? "null"}</span>
      <span data-testid="biz">{businessId ?? "null"}</span>
    </>
  );
}

beforeEach(() => {
  capturedCallback = null;
  mockGetDoc.mockReset();
});

describe("StaffAuthContext", () => {
  it("shows loading state before auth resolves", () => {
    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("provides null user and businessId when signed out", async () => {
    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    await act(async () => {
      capturedCallback!(null);
    });
    expect(screen.getByTestId("uid")).toHaveTextContent("null");
    expect(screen.getByTestId("biz")).toHaveTextContent("null");
  });

  it("provides user and businessId when signed in with staffProfiles doc", async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ businessId: "biz1" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: "Alice", role: "staff" }),
      });

    render(
      <StaffAuthProvider>
        <Consumer />
      </StaffAuthProvider>
    );
    await act(async () => {
      capturedCallback!({ uid: "user1" });
    });
    expect(screen.getByTestId("uid")).toHaveTextContent("user1");
    expect(screen.getByTestId("biz")).toHaveTextContent("biz1");
  });
});
