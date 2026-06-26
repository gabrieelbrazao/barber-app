import type { AppointmentView } from '@/lib/queries';

export type AppointmentSection = { title: string; data: AppointmentView[] };

/**
 * Splits appointments into "Próximos" (upcoming, soonest first) and
 * "Anteriores" (past, most recent first). Empty groups are omitted.
 */
export function splitByTime(list: AppointmentView[]): AppointmentSection[] {
  const now = Date.now();
  const upcoming: AppointmentView[] = [];
  const past: AppointmentView[] = [];

  for (const a of list) {
    if (new Date(a.startTime).getTime() >= now) upcoming.push(a);
    else past.push(a);
  }

  upcoming.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  past.sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));

  const sections: AppointmentSection[] = [];
  if (upcoming.length) sections.push({ title: 'Próximos', data: upcoming });
  if (past.length) sections.push({ title: 'Anteriores', data: past });
  return sections;
}
