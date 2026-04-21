export const FIELD_TYPES = ["text", "number", "phone", "dropdown", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const ENTRY_STATUSES = ["waiting", "serving", "completed", "skipped", "removed"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const QUEUE_STATUSES = ["active", "paused"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const STAFF_ROLES = ["owner", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_STATUSES = ["active", "pending"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const APPROACHING_THRESHOLD_DEFAULT = 3;
export const ROLLING_AVERAGE_WINDOW = 20;
export const DATA_DRIVEN_THRESHOLD = 5;
export const DEFAULT_ESTIMATED_TIME_PER_CUSTOMER = 10; // minutes
export const PRIMARY_COLOR_DEFAULT = "#B8926A";
