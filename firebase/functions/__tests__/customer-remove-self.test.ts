import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";

const SESSION_TOKEN = "550e8400-e29b-41d4-a716-446655440000";

const mocks = vi.hoisted(() => {
  const makePublicEntry = (status: string) => ({
    id: "entry-1",
    data: () => ({ sessionToken: SESSION_TOKEN, status }),
  });

  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const mockPublicEntriesQuery = {
    where: vi.fn(),
    limit: vi.fn(),
    get: vi.fn(),
  };
  mockPublicEntriesQuery.where.mockReturnValue(mockPublicEntriesQuery);
  mockPublicEntriesQuery.limit.mockReturnValue(mockPublicEntriesQuery);

  const mockCollectionRef = mockPublicEntriesQuery;
  const mockCollection = vi.fn(() => mockCollectionRef);
  const mockDocRef = {};
  const mockDoc = vi.fn(() => mockDocRef);
  const mockDb = { collection: mockCollection, doc: mockDoc, batch: vi.fn(() => mockBatch) };

  return { makePublicEntry, mockBatch, mockPublicEntriesQuery, mockCollection, mockDoc, mockDb };
});

vi.mock("../src/config", () => ({ db: mocks.mockDb }));
vi.mock("firebase-functions/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { customerRemoveSelf } from "../src/customer-remove-self";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    auth: null,
    data: { businessId: "biz-1", queueId: "q-1", sessionToken: SESSION_TOKEN },
    ...overrides,
  } as any;
}

describe("customerRemoveSelf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws invalid-argument for missing sessionToken", async () => {
    const req = makeRequest({ data: { businessId: "biz-1", queueId: "q-1", sessionToken: "" } });
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument for non-UUID sessionToken", async () => {
    const req = makeRequest({ data: { businessId: "biz-1", queueId: "q-1", sessionToken: "not-a-uuid" } });
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws not-found when no entry matches sessionToken", async () => {
    mocks.mockPublicEntriesQuery.get.mockResolvedValueOnce({ empty: true, docs: [] });
    const req = makeRequest();
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "not-found" });
  });

  it("throws failed-precondition when entry is not waiting", async () => {
    mocks.mockPublicEntriesQuery.get.mockResolvedValueOnce({
      empty: false,
      docs: [mocks.makePublicEntry("serving")],
    });
    const req = makeRequest();
    await expect((customerRemoveSelf as any).run(req)).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("updates both entries and publicEntries to removed on success", async () => {
    mocks.mockPublicEntriesQuery.get.mockResolvedValueOnce({
      empty: false,
      docs: [mocks.makePublicEntry("waiting")],
    });
    const req = makeRequest();
    const result = await (customerRemoveSelf as any).run(req);
    expect(result).toEqual({ success: true });
    expect(mocks.mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalled();
  });
});
