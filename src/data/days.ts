// Day-by-day plan of the whole trip (Aug 3–19, 2026), used by the Trip
// timeline, the "Today" card and the progress bar. Dates are local trip dates.
import { LEGS, segmentById } from './tripData';

export interface DayEntry {
  date: string; // '2026-08-03' (ISO, local)
  /** Where tapping the day goes (reuses the Home views). */
  mode: 'city' | 'leg';
  id: string; // city id or segment id
  /** What kind of day it is — the UI translates these. */
  kind: 'arrival' | 'drive' | 'cityday' | 'departure';
}

export const DAYS: DayEntry[] = [
  { date: '2026-08-03', mode: 'city', id: 'chicago', kind: 'arrival' },
  { date: '2026-08-04', mode: 'city', id: 'chicago', kind: 'cityday' },
  { date: '2026-08-05', mode: 'leg', id: 'chicago-stlouis', kind: 'drive' },
  { date: '2026-08-06', mode: 'leg', id: 'stlouis-springfieldmo', kind: 'drive' },
  { date: '2026-08-07', mode: 'leg', id: 'springfieldmo-tulsa', kind: 'drive' },
  { date: '2026-08-08', mode: 'leg', id: 'tulsa-amarillo', kind: 'drive' },
  { date: '2026-08-09', mode: 'leg', id: 'amarillo-albuquerque', kind: 'drive' },
  { date: '2026-08-10', mode: 'city', id: 'albuquerque', kind: 'cityday' },
  { date: '2026-08-11', mode: 'leg', id: 'albuquerque-grandcanyon', kind: 'drive' },
  { date: '2026-08-12', mode: 'leg', id: 'grandcanyon-springdale', kind: 'drive' },
  { date: '2026-08-13', mode: 'city', id: 'springdale', kind: 'cityday' },
  { date: '2026-08-14', mode: 'leg', id: 'springdale-lasvegas', kind: 'drive' },
  { date: '2026-08-15', mode: 'leg', id: 'lasvegas-threerivers', kind: 'drive' },
  { date: '2026-08-16', mode: 'leg', id: 'threerivers-losangeles', kind: 'drive' },
  { date: '2026-08-17', mode: 'city', id: 'los-angeles', kind: 'cityday' },
  { date: '2026-08-18', mode: 'city', id: 'los-angeles', kind: 'cityday' },
  { date: '2026-08-19', mode: 'city', id: 'los-angeles', kind: 'departure' },
];

export const TRIP_START = '2026-08-03';
export const TRIP_END = '2026-08-19';

/** Today's date as local ISO 'YYYY-MM-DD' (NOT toISOString, which is UTC). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function dayForDate(iso: string): DayEntry | undefined {
  return DAYS.find((d) => d.date === iso);
}

/** Total driving miles of the trip (sum of all legs). */
export const TOTAL_MILES = LEGS.reduce((sum, l) => sum + (l.distanceMiles ?? 0), 0);

/** Miles of the legs already driven strictly before the given date. */
export function milesDoneBy(iso: string): number {
  return DAYS.filter((d) => d.mode === 'leg' && d.date < iso).reduce(
    (sum, d) => sum + (segmentById(d.id)?.distanceMiles ?? 0),
    0,
  );
}
