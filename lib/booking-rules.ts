export const OPENING_MINUTES = 9 * 60;
export const CLOSING_MINUTES = 17 * 60;
export const START_INTERVAL = 30;
export const SLOT_INTERVAL = 15;

export function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function candidateTimes(duration: number) {
  const result: string[] = [];
  for (let start = OPENING_MINUTES; start + duration <= CLOSING_MINUTES; start += START_INTERVAL) {
    result.push(minutesToTime(start));
  }
  return result;
}

export function occupiedSlots(time: string, duration: number) {
  const start = timeToMinutes(time);
  const slots: string[] = [];
  for (let minute = start; minute < start + duration; minute += SLOT_INTERVAL) {
    slots.push(minutesToTime(minute));
  }
  return slots;
}

export function filterAvailableTimes(duration: number, unavailableSlots: Iterable<string>) {
  const unavailable = new Set(unavailableSlots);
  return candidateTimes(duration).filter((time) =>
    occupiedSlots(time, duration).every((slot) => !unavailable.has(slot)),
  );
}
