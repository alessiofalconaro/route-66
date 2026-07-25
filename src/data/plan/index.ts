// The full trip plan: one PlanDay per calendar day, Aug 3-19.
// Read-only, like tripData — user edits live in localStorage overrides
// (lib/planOverrides.ts) and sync across the phones via the Worker's /plan.
import type { PlanDay } from './types';
import { CHICAGO_DAYS } from './chicago';
import { MIDWEST_DAYS } from './midwest';
import { SOUTHWEST_DAYS } from './southwest';
import { WEST_DAYS } from './west';
import { LA_DAYS } from './losangeles';

export * from './types';

export const TRIP_PLAN: PlanDay[] = [
  ...CHICAGO_DAYS,
  ...MIDWEST_DAYS,
  ...SOUTHWEST_DAYS,
  ...WEST_DAYS,
  ...LA_DAYS,
];

// Lookup indexes built once at module load.
const BY_ID = new Map(TRIP_PLAN.map((d) => [d.id, d]));
const BY_ISO = new Map(TRIP_PLAN.map((d) => [d.iso, d]));

export function planDayById(id: string): PlanDay | undefined {
  return BY_ID.get(id);
}

export function planDayByIso(iso: string): PlanDay | undefined {
  return BY_ISO.get(iso);
}

/** Days that belong to a tripData segment (a leg or a city segment). */
export function planDaysForSegment(segmentId: string): PlanDay[] {
  return TRIP_PLAN.filter((d) => d.segmentIds?.includes(segmentId));
}

/** Days that touch an overnight city (origin OR destination). */
export function planDaysForCity(cityId: string): PlanDay[] {
  return TRIP_PLAN.filter((d) => d.cityIds?.includes(cityId));
}

/**
 * Resolves a deep-link key (`#/more/plan/<key>`) into the days to show.
 * The key can be a day id, a segment id or a city id; anything unknown
 * falls back to the whole trip so a stale bookmark never renders empty.
 */
export function resolvePlanFocus(key?: string): { days: PlanDay[]; focused: boolean } {
  if (!key) return { days: TRIP_PLAN, focused: false };
  const day = planDayById(key);
  if (day) return { days: [day], focused: true };
  const bySegment = planDaysForSegment(key);
  if (bySegment.length > 0) return { days: bySegment, focused: true };
  const byCity = planDaysForCity(key);
  if (byCity.length > 0) return { days: byCity, focused: true };
  return { days: TRIP_PLAN, focused: false };
}
