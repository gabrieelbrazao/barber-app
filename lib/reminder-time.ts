/** Pure reminder-timing helper (no native imports, so it's unit-testable). */

export const REMINDER_LEAD_MINUTES = 60;

/** Fire time for a reminder: `leadMinutes` before the appointment start. */
export function reminderDate(startISO: string, leadMinutes = REMINDER_LEAD_MINUTES): Date {
  return new Date(new Date(startISO).getTime() - leadMinutes * 60_000);
}
