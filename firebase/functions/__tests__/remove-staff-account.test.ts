import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";

const mocks = vi.hoisted(() => {
  const ownerDoc = { exists: true, data: () => ({ role: "owner" }) };
  const nonOwnerDoc = { exists: false };
  const mockGet = vi.fn().mockResolvedValue(ownerDoc);
  const mockDocRef = { get: mockGet };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockBatch = {
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  const mockDb = { doc: mockDoc, batch: vi.fn(() => mockBatch) };
  const mockDeleteUser = vi.fn().mockResolvedValue(undefined);
  const mockAuthInstance = { deleteUser: mockDeleteUser };
  const mockGetAuth = vi.fn(() => mockAuthInstance);
  return { ownerDoc, nonOwnerDoc, mockGet, mockDocRef, mockDoc, mockBatch, mockDb, mockDeleteUser, mockAuthInstance, mockGetAuth };
});

vi.mock("firebase-admin/auth", () => ({ getAuth: mocks.mockGetAuth }));
vi.mock("../src/config", () => ({ db: mocks.mockDb }));
vi.mock("firebase-functions/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { removeStaffAccount } from "../src/remove-staff-account";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    auth: { uid: "owner-uid" },
    data: { businessId: "biz-1", staffId: "staff-uid" },
    ...overrides,
  } as any;
}

describe("removeStaffAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws unauthenticated when no auth", async () => {
    const req = makeRequest({ auth: undefined });
    await expect((removeStaffAccount as any).run(req)).rejects.toThrow(HttpsError);
  });

  it("throws permission-denied when caller is not owner", async () => {
    mocks.mockGet.mockResolvedValueOnce({ exists: false });
    const req = makeRequest();
    await expect((removeStaffAccount as any).run(req)).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("throws invalid-argument when staffId is missing", async () => {
    const req = makeRequest({ data: { businessId: "biz-1", staffId: "" } });
    await expect((removeStaffAccount as any).run(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when owner tries to remove themselves", async () => {
    const req = makeRequest({ data: { businessId: "biz-1", staffId: "owner-uid" } });
    await expect((removeStaffAccount as any).run(req)).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Cannot remove yourself from the business",
    });
  });

  it("deletes auth user and staff docs on success", async () => {
    const req = makeRequest();
    await (removeStaffAccount as any).run(req);
    expect(mocks.mockDeleteUser).toHaveBeenCalledWith("staff-uid");
    expect(mocks.mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalled();
  });
});
