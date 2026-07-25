// Reuses the photos already bundled for the itinerary inside the day plans.
// A plan step and its POI/hotel point at the same place, so we match them on
// the Google Maps query string rather than duplicating a photo map by hand —
// which means new steps pick up a photo automatically as soon as their
// mapsQuery matches an existing stop.
import { HOTELS, SEGMENTS } from '../tripData';
import { PHOTOS } from '../photos';

/** Lowercase, letters+digits only: tolerates punctuation/spacing differences. */
function norm(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const BY_QUERY = new Map<string, string>();
for (const seg of SEGMENTS) {
  for (const p of seg.pois) {
    if (PHOTOS[p.id]) BY_QUERY.set(norm(p.mapsQuery), PHOTOS[p.id]);
  }
}
for (const h of HOTELS) {
  if (PHOTOS[h.id]) BY_QUERY.set(norm(h.mapsQuery), PHOTOS[h.id]);
}

/** Bundled photo path for a plan step's mapsQuery, or undefined. */
export function planStepPhoto(mapsQuery?: string): string | undefined {
  if (!mapsQuery) return undefined;
  const path = BY_QUERY.get(norm(mapsQuery));
  return path ? import.meta.env.BASE_URL + path : undefined;
}
