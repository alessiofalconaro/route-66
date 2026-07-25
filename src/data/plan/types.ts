// Shared types for the day-by-day trip plans (one PlanDay per calendar day).
// The plan is a separate layer from tripData: tripData says WHAT to see,
// the plan says WHEN, in which order, and how long it takes to get there.
//
// ⚠️ STEP IDs ARE A GLOBAL NAMESPACE. lib/planOverrides.ts keys removals and
// edits by bare step id across every day, so two days must NEVER share a slug
// (deleting one "lunch" would delete them all). Convention: `a<dayOfMonth>-`,
// e.g. `a8-cadillac`. Existing ids must never be renamed either — they are
// already stored in the travelers' synced edits.

// Localized text: the app UI is EN/ES, so plan notes carry both languages.
// Proper nouns (place names) stay in English, per the project i18n rule.
export interface LText {
  en: string;
  es: string;
}

export interface PlanTransit {
  mode: 'walk' | 'bus' | 'car' | 'taxi';
  minutes: number;
  detail?: LText; // e.g. "bus 151 from Michigan Ave"
}

export interface PlanStep {
  id: string;
  time: string; // "15:00" — suggested start time, not a hard booking
  name: string; // proper noun, stays in English
  durationMin?: number;
  optional?: boolean; // "only if we pass nearby" stops (Starbucks, Nutella)
  transit?: PlanTransit; // how to get HERE from the previous step
  note?: LText;
  mapsQuery?: string; // used with mapsUrl(); coordinates for ambiguous pins
}

export interface PlanDay {
  id: string;
  date: string; // "Aug 3"
  iso: string; // "2026-08-03" — lets the view auto-open the current day
  title: LText;
  steps: PlanStep[];
  /** Segments (tripData ids) this day belongs to — powers the shortcut cards. */
  segmentIds?: string[];
  /** Overnight cities touched that day (origin and destination hotel ids). */
  cityIds?: string[];
  /** IANA zone the `time` values are expressed in (the route crosses three). */
  tz?: string;
}

// Small helper to keep the day literals short.
export const lt = (en: string, es: string): LText => ({ en, es });
