// Formatting helpers shared by every view.
// Distances and speeds are shown in BOTH units ("370 mi / 595 km") because the
// travelers think in km but every US road sign is in miles — seeing the pair
// removes the mental conversion. Durations over an hour read "1h 30m".

const KM_PER_MILE = 1.609344;

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/** "370 mi / 595 km" — rounded, no decimals (these are planning figures). */
export function fmtDistance(miles: number): string {
  return `${Math.round(miles).toLocaleString()} mi / ${Math.round(milesToKm(miles)).toLocaleString()} km`;
}

/** "75 mph / 120 km/h" */
export function fmtSpeed(mph: number): string {
  return `${mph} mph / ${Math.round(milesToKm(mph) / 5) * 5} km/h`;
}

/**
 * Distance (km) to reach a stop. Uses the explicit `km` when the data has it;
 * otherwise ESTIMATES it from the mode and the minutes, using typical average
 * speeds — these are planning figures, like the durations themselves. Car is
 * split city vs highway because a single speed can't fit both.
 */
export function transitKm(mode: string, minutes: number, km?: number): number {
  if (typeof km === 'number') return km;
  // Average speeds (km/h). Car scales with the leg length: a short hop is
  // city crawl, a long one is interstate cruise (US limits here are 70-80 mph
  // ≈ 112-128 km/h, so a long leg averages ~110 with the odd slowdown). This
  // is why a fixed speed made long legs look 40-50 km too short.
  const kmh =
    mode === 'walk' ? 4.8 :
    mode === 'bus' ? 18 :
    mode === 'taxi' ? 26 :
    minutes <= 10 ? 34 : // car, in town
    minutes <= 25 ? 68 : // car, getting out of town / mixed
    110; // car, interstate
  return (kmh * minutes) / 60;
}

/** "0.5 km / 0.3 mi" for short hops, "90 km / 56 mi" for legs (km first —
 *  the travelers think in km; whole numbers once past 10). */
export function fmtTransitDistance(km: number): string {
  const mi = km / KM_PER_MILE;
  const r = (n: number) => (n < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString());
  return `${r(km)} km / ${r(mi)} mi`;
}

/**
 * "45 min" up to an hour, "1h 30m" beyond, "2h" when it is exact.
 * Takes the localized "min" label so it still reads right in Spanish.
 */
export function fmtDuration(minutes: number, minLabel: string): string {
  if (minutes < 60) return `${minutes} ${minLabel}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
