import { reminderDate } from '@/lib/reminder-time';

describe('reminderDate', () => {
  it('fires the default 60 minutes before the appointment start', () => {
    const start = '2026-06-30T14:00:00.000Z';
    expect(reminderDate(start).toISOString()).toBe('2026-06-30T13:00:00.000Z');
  });

  it('honors a custom lead time', () => {
    const start = '2026-06-30T14:00:00.000Z';
    expect(reminderDate(start, 90).toISOString()).toBe('2026-06-30T12:30:00.000Z');
  });
});
