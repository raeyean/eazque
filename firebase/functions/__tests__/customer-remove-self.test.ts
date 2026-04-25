import { describe, it, expect, vi, beforeEach } from "vitest";

const SESSION_TOKEN = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_TOKEN = "11111111-2222-3333-4444-555555555555";

const mocks = vi.hoisted(() => {
  const makeEntrySnap = (
    opts: { exists: boolean; sessionToken?: string; status?: string } = { exists: true }
  ) => ({
    exists: opts.exists,
    data: () => ({ sessionToken: opts.sessionToken, status: opts.status }),
  });

  const mockEntryRef = { get: vi.fn() };
  const mockPublicEntryRef = {};
  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  const mockDoc = vi.fn((path: string) =>
    path.includes("/publicEntries/") ? mockPublicEntryRef : mockEntryRef
  );
  const mockDb = { doc: mockDoc, batch: vi.fn(() => mockBatch) };

  return { makeEntrySnap, mockEntryRef, mockPublicEntryRef, mockBatch, mockDoc, mockDb };
});

vi.mock("../src/config", () => ({ db: mocks.mockDb }));
vi.mock("firebase-functions/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
}));

import { customerRemoveSelf } from "../src/customer-remove-self";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    auth: null,
    data: {
      businessId: "biz-1",
      queueId: "q-1",
      entryId: "entry-1",
      sessionToken: SESSION_TOKEN,
    },
    ...overrides,
  } as any;
}

describe("customerRemoveSelf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws invalid-argument for missing entryId", async () => {
    const req = makeRequest({
      data: { businessId: "biz-1", queueId: "q-1", entryId: "", sessionToken: SESSION_TOKEN },
    });
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument for non-UUID sessionToken", async () => {
    const req = makeRequest({
      data: { businessId: "biz-1", queueId: "q-1", entryId: "entry-1", sessionToken: "not-a-uuid" },
    });
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws not-found when entry does not exist", async () => {
    mocks.mockEntryRef.get.mockResolvedValueOnce(mocks.makeEntrySnap({ exists: false }));
    await expect((customerRemoveSelf as any).run(makeRequest())).rejects.toMatchObject({ code: "not-found" });
  });

  it("throws not-found when sessionToken does not match stored token", async () => {
    mocks.mockEntryRef.get.mockResolvedValueOnce(
      mocks.makeEntrySnap({ exists: true, sessionToken: OTHER_TOKEN, status: "waiting" })
    );
    await expect((customerRemoveSelf as any).run(makeRequest())).rejects.toMatchObject({ code: "not-found" });
    expect(mocks.mockBatch.commit).not.toHaveBeenCalled();
  });

  it("throws failed-precondition when entry is not waiting", async () => {
    mocks.mockEntryRef.get.mockResolvedValueOnce(
      mocks.makeEntrySnap({ exists: true, sessionToken: SESSION_TOKEN, status: "serving" })
    );
    await expect((customerRemoveSelf as any).run(makeRequest())).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("updates both entries and publicEntries to removed on success", async () => {
    mocks.mockEntryRef.get.mockResolvedValueOnce(
      mocks.makeEntrySnap({ exists: true, sessionToken: SESSION_TOKEN, status: "waiting" })
    );
    const result = await (customerRemoveSelf as any).run(makeRequest());
    expect(result).toEqual({ success: true });
    expect(mocks.mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalled();
  });
});
