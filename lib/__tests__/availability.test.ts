import { generateSlots } from '@/lib/availability';
import type { WorkingHours } from '@/lib/database.types';

// A local-midnight day; working hours given for every weekday so the test is
// independent of which weekday the fixed date lands on.
const DAY = new Date(2026, 5, 29); // Jun 29 2026, local midnight
const OPEN_ALL_DAYS: WorkingHours = {
  sun: ['09:00', '12:00'],
  mon: ['09:00', '12:00'],
  tue: ['09:00', '12:00'],
  wed: ['09:00', '12:00'],
  thu: ['09:00', '12:00'],
  fri: ['09:00', '12:00'],
  sat: ['09:00', '12:00'],
};
// `now` in the distant past so nothing is considered "in the past".
const PAST = new Date(2020, 0, 1);

function at(hour: number, minute = 0): Date {
  const d = new Date(DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('generateSlots', () => {
  it('returns [] when the shop is closed that day', () => {
    const closed: WorkingHours = { ...OPEN_ALL_DAYS };
    closed[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][DAY.getDay()] as keyof WorkingHours] =
      null;
    expect(generateSlots(DAY, closed, 60, [], PAST)).toEqual([]);
  });

  it('emits 30-min-granularity start slots that fit before closing', () => {
    const slots = generateSlots(DAY, OPEN_ALL_DAYS, 60, [], PAST);
    // 09:00..11:00 in 30-min steps (11:00+60min == 12:00 close); 11:30 would overrun.
    expect(slots.map((s) => s.start.getTime())).toEqual([
      at(9, 0).getTime(),
      at(9, 30).getTime(),
      at(10, 0).getTime(),
      at(10, 30).getTime(),
      at(11, 0).getTime(),
    ]);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marks slots overlapping a booking as unavailable', () => {
    const booked = [{ start: at(10, 0).toISOString(), end: at(10, 30).toISOString() }];
    const slots = generateSlots(DAY, OPEN_ALL_DAYS, 60, booked, PAST);
    const byStart = (h: number, m = 0) =>
      slots.find((s) => s.start.getTime() === at(h, m).getTime())!;
    expect(byStart(9, 0).available).toBe(true); // 09:00–10:00 ends exactly at booking start
    expect(byStart(9, 30).available).toBe(false); // 09:30–10:30 overlaps
    expect(byStart(10, 0).available).toBe(false); // 10:00–11:00 overlaps
  });

  it('marks past slots as unavailable', () => {
    const now = at(10, 0);
    const slots = generateSlots(DAY, OPEN_ALL_DAYS, 60, [], now);
    const byStart = (h: number, m = 0) =>
      slots.find((s) => s.start.getTime() === at(h, m).getTime())!;
    expect(byStart(9, 0).available).toBe(false);
    expect(byStart(10, 30).available).toBe(true);
  });
});
