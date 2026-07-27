import { CLOSING_MINUTES, minutesToTime, OPENING_MINUTES, SLOT_INTERVAL, timeToMinutes } from "./booking-rules.ts";

export function blockedSlots(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < OPENING_MINUTES ||
    end > CLOSING_MINUTES ||
    start >= end ||
    start % SLOT_INTERVAL !== 0 ||
    end % SLOT_INTERVAL !== 0
  ) return [];
  const slots: string[] = [];
  for (let minute = start; minute < end; minute += SLOT_INTERVAL) slots.push(minutesToTime(minute));
  return slots;
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
