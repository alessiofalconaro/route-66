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

// Emoji shown (at the same size as a photo) for steps that have no bundled
// photo, so every row lines up AND the icon hints at what the stop is. The
// list is ordered: the FIRST rule that matches the step's name/id wins.
const ICON_RULES: [RegExp, string][] = [
  [/time.?zone|clock/, '🕐'], // the "you gain/lose an hour" markers
  [/laundry|lavander|laundromat/, '🧺'],
  [/breakfast/, '🥐'],
  [/lunch|dinner|dine|\bmeal\b|steak|bbq|brunch|\bfood\b|\beat\b/, '🍽️'],
  [/pool|swim/, '🏊'],
  [/night|sleep|alarm/, '😴'],
  [/\bfree\b|break|downtime|relax|\brest\b|slow/, '☕'], // deliberate downtime
  [/hotel|motel|lodge|suites|\binn\b|check.?in|check.?out|arrive/, '🛏️'],
  [/fuel|gas station|refuel|\btank\b/, '⛽'],
  [/hit the road|depart|early start|on the road|\bdrive\b|driving|\bstart\b/, '🚗'],
  [/shop|store|souvenir|market|grocer|jersey/, '🛍️'],
  [/photo|viewpoint|overlook|\bsign\b|scenic/, '📷'],
];

/** A category-ish emoji for a step, used when it has no photo. Falls back to a
 *  neutral pin so the layout is always a filled 56×56 tile. */
export function stepIcon(step: { name: string; id: string }): string {
  const hay = `${step.name} ${step.id}`.toLowerCase();
  for (const [re, emoji] of ICON_RULES) if (re.test(hay)) return emoji;
  return '📍';
}
