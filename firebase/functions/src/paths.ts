export const paths = {
  business: (businessId: string) =>
    `businesses/${businessId}`,
  staff: (businessId: string) =>
    `businesses/${businessId}/staff`,
  staffMember: (businessId: string, staffId: string) =>
    `businesses/${businessId}/staff/${staffId}`,
  staffProfile: (uid: string) =>
    `staffProfiles/${uid}`,
  queues: (businessId: string) =>
    `businesses/${businessId}/queues`,
  queue: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}`,
  entries: (businessId: string, queueId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries`,
  entry: (businessId: string, queueId: string, entryId: string) =>
    `businesses/${businessId}/queues/${queueId}/entries/${entryId}`,
  dailyStat: (businessId: string, date: string) =>
    `businesses/${businessId}/dailyStats/${date}`,
} as const;
