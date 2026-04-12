import type { FieldType, EntryStatus, QueueStatus, StaffRole, StaffStatus } from "./constants";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // only for "dropdown"
}

export interface Business {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappApiKey: string;
  defaultEstimatedTimePerCustomer: number;
  approachingThreshold: number;
  formFields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

/** Fields safe to expose to unauthenticated customers */
export interface BusinessPublic {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  formFields: FormField[];
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  status: StaffStatus;
  createdAt: Date;
}

export interface Queue {
  id: string;
  name: string;
  status: QueueStatus;
  currentNumber: number;
  nextNumber: number;
  date: string; // YYYY-MM-DD
  avgServiceTime: number;
  completedCount: number;
}

export interface QueueEntry {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: EntryStatus;
  customerName: string;
  phone: string;
  formData: Record<string, string | number | boolean>;
  notes: string;
  sessionToken: string;
  joinedAt: Date;
  servedAt: Date | null;
  completedAt: Date | null;
}

export interface DailyStats {
  date: string;                                // YYYY-MM-DD
  totalJoined: number;                         // all entries regardless of status
  completedCount: number;                      // status === "completed"
  skippedCount: number;                        // status === "skipped"
  removedCount: number;                        // status === "removed"
  avgServiceTime: number;                      // mean of (completedAt - servedAt) in minutes
  avgWaitTime: number;                         // mean of (servedAt - joinedAt) in minutes
  hourlyDistribution: Record<string, number>;  // hour string "0"–"23" → customer count
}

/** Fields safe to expose to other customers in the queue list */
export interface QueueEntryPublic {
  id: string;
  queueNumber: number;
  displayNumber: string;
  status: EntryStatus;
}

/** Response from onCustomerJoin callable */
export interface JoinQueueResponse {
  entryId: string;
  queueNumber: number;
  displayNumber: string;
  sessionToken: string;
  currentNumber: number;
  estimatedWaitMinutes: number;
}

/** Request payload for onCustomerJoin callable */
export interface JoinQueueRequest {
  businessId: string;
  queueId: string;
  customerName: string;
  phone: string;
  formData: Record<string, string | number | boolean>;
}
