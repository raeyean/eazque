import { DATA_DRIVEN_THRESHOLD } from "./constants";

export function formatDisplayNumber(num: number): string {
  const padded = num.toString().padStart(3, "0");
  return `Q-${padded}`;
}

export interface EstimateWaitParams {
  positionInQueue: number;
  avgServiceTime: number;
  completedCount: number;
  defaultEstimatedTime: number;
}

export function estimateWaitMinutes(params: EstimateWaitParams): number {
  const { positionInQueue, avgServiceTime, completedCount, defaultEstimatedTime } = params;

  if (positionInQueue === 0) return 0;

  const timePerCustomer =
    completedCount >= DATA_DRIVEN_THRESHOLD ? avgServiceTime : defaultEstimatedTime;

  return Math.round(positionInQueue * timePerCustomer);
}
