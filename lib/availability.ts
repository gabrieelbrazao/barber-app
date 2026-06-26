import type { WorkingHours } from '@/lib/database.types';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const SLOT_GRANULARITY_MIN = 30;

export type Slot = {
  /** Local Date for the slot start. */
  start: Date;
  end: Date;
  available: boolean;
};

export type BookedRange = { start: string; end: string };

function parseHHmm(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Build selectable start slots for `day`, given the barber's working hours, the service
 * duration, and the day's existing (non-cancelled) appointments. Slots whose end runs past
 * closing, overlap a booking, or are already in the past are marked `available: false`.
 */
export function generateSlots(
  day: Date,
  workingHours: WorkingHours,
  durationMinutes: number,
  booked: BookedRange[],
  now: Date = new Date()
): Slot[] {
  const key = WEEKDAY_KEYS[day.getDay()];
  const hours = workingHours[key];
  if (!hours) return [];

  const [open, close] = hours;
  const openAt = parseHHmm(day, open);
  const closeAt = parseHHmm(day, close);
  const bookedRanges = booked.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));

  const slots: Slot[] = [];
  for (
    let start = new Date(openAt);
    start.getTime() + durationMinutes * 60_000 <= closeAt.getTime();
    start = new Date(start.getTime() + SLOT_GRANULARITY_MIN * 60_000)
  ) {
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const inPast = start <= now;
    const collides = bookedRanges.some((r) => overlaps(start, end, r.start, r.end));
    slots.push({ start: new Date(start), end, available: !inPast && !collides });
  }
  return slots;
}
