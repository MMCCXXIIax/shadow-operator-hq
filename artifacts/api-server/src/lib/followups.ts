// Day offsets (from lead creation) at which a follow-up is scheduled.
// This is the actual behavior — do not confuse with older docs that said 0,2,5,10.
export const FOLLOW_UP_OFFSETS = [0, 3, 7, 11, 14] as const;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
