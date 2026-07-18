// Central type definitions (see CLAUDE.md section 7).
// In Java terms: this file is like a package of small POJOs / records,
// but TypeScript types exist only at compile time — they add zero runtime code.

// A "union type": Category can ONLY be one of these exact strings.
// Java analogy: an enum, but the values are plain strings at runtime.
export type Category =
  | 'route66'
  | 'nature'
  | 'museum'
  | 'photo'
  | 'food'
  | 'city'
  | 'nba'
  | 'fuel'
  | 'hotel'
  | 'other';

export interface Poi {
  id: string;
  name: string;
  city: string; // e.g. "Chicago, IL"
  category: Category;
  dwellMinutes?: number; // "?" = optional field (Java analogy: Optional<Integer>)
  note?: string;
  mapsQuery: string; // used to build the Google Maps URL
  photo?: string; // /img/... path or Wikimedia URL
}

export interface Hotel {
  id: string;
  city: string;
  name: string;
  nights: string; // "Aug 5–6"
  parking: string; // "Free" | "$67.63/day"
  resortFee?: string;
  mapsQuery: string;
}

export interface FuelStop {
  segmentId: string;
  station: string;
  address: string;
  pricePerGal: number;
  fillGal: number;
  amountUsd: number;
  warning?: string;
}

export interface Segment {
  id: string; // "chicago" or "chicago-stlouis"
  kind: 'city' | 'leg';
  label: string; // "Chicago" or "Chicago → St. Louis"
  dates?: string;
  distanceMiles?: number;
  driveHours?: number;
  pois: Poi[];
  fuelStops?: FuelStop[];
  hotelId?: string; // the night's hotel
  warning?: string; // static safety note (desert heat, sparse fuel, shuttle...)
}

// ---- User-editable state (all persisted in localStorage) ----

export interface Traveler {
  id: string; // stable internal id — renames never break references
  name: string;
}

export interface Expense {
  id: string;
  payerId: string; // Traveler.id — resolved to a display name at render time
  amountUsd: number;
  category: 'fuel' | 'hotel' | 'food' | 'tickets' | 'souvenirs' | 'other';
  note: string;
  date: string; // ISO "2026-08-05"
}

// The user's local edits to the itinerary, merged over the bundled tripData.
export interface UserOverrides {
  removedPoiIds: string[];
  // Partial<Poi> = "any subset of Poi's fields" (only what the user changed)
  editedPois: Record<string, Partial<Poi>>;
  // new POIs the user added, grouped by segment id
  addedPois: Record<string, Poi[]>;
  // custom display order of POI ids, per segment
  poiOrder: Record<string, string[]>;
}

export const EMPTY_OVERRIDES: UserOverrides = {
  removedPoiIds: [],
  editedPois: {},
  addedPois: {},
  poiOrder: {},
};
