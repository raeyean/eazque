import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import {
  PRIMARY_COLOR_DEFAULT,
  DEFAULT_ESTIMATED_TIME_PER_CUSTOMER,
  APPROACHING_THRESHOLD_DEFAULT,
} from "@eazque/shared";

// Hoist mock instances so they can be referenced in vi.mock factories
const mocks = vi.hoisted(() => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  const mockDoc = vi.fn((path: string) => ({ path }));
  const mockQueueRef = { path: "businesses/test-uid-123/queues/queue-auto-id" };
  const mockCollection = vi.fn(() => ({ doc: vi.fn(() => mockQueueRef) }));
  const mockDb = {
    batch: vi.fn(() => mockBatch),
    doc: mockDoc,
    collection: mockCollection,
  };
  const mockCreateUser = vi.fn().mockResolvedValue({ uid: "test-uid-123" });
  const mockDeleteUser = vi.fn().mockResolvedValue(undefined);
  const mockAuthInstance = {
    createUser: mockCreateUser,
    deleteUser: mockDeleteUser,
  };
  const mockGetAuth = vi.fn(() => mockAuthInstance);
  return { mockBatch, mockDoc, mockQueueRef, mockCollection, mockDb, mockCreateUser, mockDeleteUser, mockAuthInstance, mockGetAuth };
});

vi.mock("firebase-admin/auth", () => ({
  getAuth: mocks.mockGetAuth,
}));

vi.mock("../src/config", () => ({
  db: mocks.mockDb,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "MOCK_TIMESTAMP"),
  },
}));

// Import AFTER mocks are set up
import { createBusinessAccountHandler } from "../src/create-business-account";

const validInput = {
  email: "owner@example.com",
  password: "password123",
  ownerName: "Test Owner",
  businessName: "Test Business",
};

describe("createBusinessAccountHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set default resolved values after clearAllMocks
    mocks.mockCreateUser.mockResolvedValue({ uid: "test-uid-123" });
    mocks.mockDeleteUser.mockResolvedValue(undefined);
    mocks.mockBatch.commit.mockResolvedValue(undefined);
    mocks.mockBatch.set.mockReset();
    mocks.mockCollection.mockReturnValue({ doc: vi.fn(() => mocks.mockQueueRef) });
  });

  it("rejects missing required fields (no email)", async () => {
    const input = { password: "password123", ownerName: "Test Owner", businessName: "Test Business" };
    await expect(createBusinessAccountHandler(input)).rejects.toThrow(HttpsError);
    try {
      await createBusinessAccountHandler(input);
    } catch (err: any) {
      expect(err.code).toBe("invalid-argument");
    }
  });

  it("rejects invalid email", async () => {
    const input = { ...validInput, email: "not-an-email" };
    await expect(createBusinessAccountHandler(input)).rejects.toThrow(HttpsError);
    try {
      await createBusinessAccountHandler(input);
    } catch (err: any) {
      expect(err.code).toBe("invalid-argument");
    }
  });

  it("rejects short password (< 6 chars)", async () => {
    const input = { ...validInput, password: "abc" };
    await expect(createBusinessAccountHandler(input)).rejects.toThrow(HttpsError);
    try {
      await createBusinessAccountHandler(input);
    } catch (err: any) {
      expect(err.code).toBe("invalid-argument");
    }
  });

  it("creates auth user with correct email/password/displayName", async () => {
    await createBusinessAccountHandler(validInput);
    expect(mocks.mockCreateUser).toHaveBeenCalledWith({
      email: validInput.email,
      password: validInput.password,
      displayName: validInput.ownerName,
    });
  });

  it("writes business doc, owner staff doc, staffProfile doc, and initial queue via batch", async () => {
    await createBusinessAccountHandler(validInput);
    expect(mocks.mockBatch.set).toHaveBeenCalledTimes(4);
    // Verify commit was called
    expect(mocks.mockBatch.commit).toHaveBeenCalledTimes(1);
    // Verify doc paths used
    const docCalls = mocks.mockDoc.mock.calls.map((c) => c[0]);
    expect(docCalls.some((p) => p.includes("businesses/test-uid-123") && !p.includes("staff"))).toBe(true);
    expect(docCalls.some((p) => p.includes("businesses/test-uid-123/staff/test-uid-123"))).toBe(true);
    expect(docCalls.some((p) => p.includes("staffProfiles/test-uid-123"))).toBe(true);
    // Verify collection was called for the queue
    expect(mocks.mockCollection).toHaveBeenCalledWith("businesses/test-uid-123/queues");

    // Verify data written to each doc
    const businessData = mocks.mockBatch.set.mock.calls[0][1];
    expect(businessData.name).toBe(validInput.businessName);
    expect(businessData.logo).toBe("");
    expect(businessData.primaryColor).toBe(PRIMARY_COLOR_DEFAULT);
    expect(businessData.whatsappNumber).toBe("");
    expect(businessData.defaultEstimatedTimePerCustomer).toBe(DEFAULT_ESTIMATED_TIME_PER_CUSTOMER);
    expect(businessData.approachingThreshold).toBe(APPROACHING_THRESHOLD_DEFAULT);
    expect(Array.isArray(businessData.formFields)).toBe(true);

    const ownerStaffData = mocks.mockBatch.set.mock.calls[1][1];
    expect(ownerStaffData.role).toBe("owner");
    expect(ownerStaffData.status).toBe("active");
    expect(ownerStaffData.name).toBe(validInput.ownerName);

    const staffProfileData = mocks.mockBatch.set.mock.calls[2][1];
    expect(staffProfileData).toEqual({ businessId: "test-uid-123" });

    const queueData = mocks.mockBatch.set.mock.calls[3][1];
    expect(queueData.name).toBe("Main Queue");
    expect(queueData.status).toBe("active");
    expect(queueData.currentNumber).toBe(0);
    expect(queueData.nextNumber).toBe(1);
    expect(queueData.avgServiceTime).toBe(0);
    expect(queueData.completedCount).toBe(0);
    expect(typeof queueData.date).toBe("string");
    expect(queueData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns { uid, businessId } on success", async () => {
    const result = await createBusinessAccountHandler(validInput);
    expect(result).toEqual({ uid: "test-uid-123", businessId: "test-uid-123" });
  });

  it("throws already-exists HttpsError when auth email already in use", async () => {
    const authError = Object.assign(new Error("Email already in use"), {
      code: "auth/email-already-exists",
    });
    mocks.mockCreateUser.mockRejectedValueOnce(authError);
    await expect(createBusinessAccountHandler(validInput)).rejects.toThrow(HttpsError);
    try {
      await createBusinessAccountHandler(validInput);
    } catch (err: any) {
      expect(err.code).toBe("already-exists");
    }
  });

  it("deletes auth user (rollback) when batch commit fails", async () => {
    mocks.mockBatch.commit.mockRejectedValueOnce(new Error("Firestore commit failed"));
    await expect(createBusinessAccountHandler(validInput)).rejects.toThrow(HttpsError);
    expect(mocks.mockDeleteUser).toHaveBeenCalledWith("test-uid-123");
  });

  it("does not attempt rollback when createUser throws before uid is assigned", async () => {
    mocks.mockCreateUser.mockRejectedValueOnce({ code: "auth/invalid-email", message: "bad" });
    await expect(createBusinessAccountHandler(validInput)).rejects.toThrow();
    expect(mocks.mockDeleteUser).not.toHaveBeenCalled();
  });
});
