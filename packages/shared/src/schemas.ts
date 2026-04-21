import { z } from "zod";
import { FIELD_TYPES } from "./constants";

const fieldTypeEnum = z.enum(FIELD_TYPES);

export const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeEnum,
    label: z.string().min(1),
    required: z.boolean(),
    options: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (field) => {
      if (field.type === "dropdown") {
        return field.options !== undefined && field.options.length > 0;
      }
      return true;
    },
    { message: "Dropdown fields must have options with at least one item" }
  );

export const joinQueueRequestSchema = z.object({
  businessId: z.string().min(1),
  queueId: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  formData: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export const businessProfileSchema = z.object({
  name: z.string().min(1),
  whatsappNumber: z.string(),
  defaultEstimatedTimePerCustomer: z.number().positive(),
  approachingThreshold: z.number().int().positive(),
  formFields: z.array(formFieldSchema),
});

export const createBusinessAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ownerName: z.string().min(1).max(100),
  businessName: z.string().min(1).max(100),
  whatsappNumber: z.string().optional().default(""),
  estimatedTime: z.number().positive().optional(),
  approachingThreshold: z.number().int().positive().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  formFields: z.array(formFieldSchema).optional().default([]),
});

export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type JoinQueueRequestInput = z.infer<typeof joinQueueRequestSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type CreateBusinessAccountInput = z.infer<typeof createBusinessAccountSchema>;
