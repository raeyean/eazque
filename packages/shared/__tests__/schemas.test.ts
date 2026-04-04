import { describe, it, expect } from "vitest";
import {
  formFieldSchema,
  joinQueueRequestSchema,
  businessProfileSchema,
} from "../src/schemas";

describe("formFieldSchema", () => {
  it("accepts a valid text field", () => {
    const result = formFieldSchema.safeParse({
      id: "field-1",
      type: "text",
      label: "Your Name",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid dropdown field with options", () => {
    const result = formFieldSchema.safeParse({
      id: "field-2",
      type: "dropdown",
      label: "Service Type",
      required: false,
      options: ["General", "VIP"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown field type", () => {
    const result = formFieldSchema.safeParse({
      id: "field-3",
      type: "color-picker",
      label: "Color",
      required: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a field missing required properties", () => {
    const result = formFieldSchema.safeParse({
      id: "field-4",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a dropdown field without options", () => {
    const result = formFieldSchema.safeParse({
      id: "field-5",
      type: "dropdown",
      label: "Pick one",
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("options");
    }
  });
});

describe("joinQueueRequestSchema", () => {
  it("accepts a valid join request", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Alice",
      phone: "+60123456789",
      formData: { "field-1": "2" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty customer name", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "",
      phone: "+60123456789",
      formData: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing phone", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Alice",
      formData: {},
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty formData object", () => {
    const result = joinQueueRequestSchema.safeParse({
      businessId: "biz-123",
      queueId: "queue-1",
      customerName: "Bob",
      phone: "+60198765432",
      formData: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("businessProfileSchema", () => {
  it("accepts a valid business profile", () => {
    const result = businessProfileSchema.safeParse({
      name: "Amy's Bakery",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: 10,
      approachingThreshold: 3,
      formFields: [
        { id: "f1", type: "number", label: "Number of Pax", required: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative estimated time", () => {
    const result = businessProfileSchema.safeParse({
      name: "Bad Cafe",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: -5,
      approachingThreshold: 3,
      formFields: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty business name", () => {
    const result = businessProfileSchema.safeParse({
      name: "",
      whatsappNumber: "+60123456789",
      defaultEstimatedTimePerCustomer: 10,
      approachingThreshold: 3,
      formFields: [],
    });
    expect(result.success).toBe(false);
  });
});
