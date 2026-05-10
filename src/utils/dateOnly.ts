/** Local calendar dates as YYYY-MM-DD (avoid UTC shift from toISOString). */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmdLocal(s: string): Date {
  const parts = s.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) return new Date(NaN);
  return new Date(y, mo - 1, d);
}

/** Same rule as web Main_Itinerary `calculateDays` */
export function inclusiveDayCount(startYmd: string, endYmd: string): number {
  const start = parseYmdLocal(startYmd);
  const end = parseYmdLocal(endYmd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1;
}

export function addDaysYmd(startYmd: string, dayOffset: number): string {
  const d = parseYmdLocal(startYmd);
  d.setDate(d.getDate() + dayOffset);
  return toYmd(d);
}

export function formatDayHeader(startYmd: string, index: number): string {
  const d = parseYmdLocal(addDaysYmd(startYmd, index));
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
