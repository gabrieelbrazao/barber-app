/** Pure analytics helpers (date ranges + derived rates), unit-tested. */

export type AnalyticsRange = { from: Date; to: Date };

export type ShopAnalytics = {
  revenue_cents: number;
  completed: number;
  cancelled: number;
  no_show: number;
  total: number;
  top_services: { name: string; count: number }[];
};

/** A [now - n days, now] window. */
export function lastNDays(n: number, now: Date = new Date()): AnalyticsRange {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - n);
  return { from, to };
}

/** No-show percentage (0–100), guarding against an empty range. */
export function noShowRate(a: Pick<ShopAnalytics, 'no_show' | 'total'>): number {
  return a.total === 0 ? 0 : Math.round((a.no_show / a.total) * 100);
}
