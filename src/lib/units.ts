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
 * "45 min" up to an hour, "1h 30m" beyond, "2h" when it is exact.
 * Takes the localized "min" label so it still reads right in Spanish.
 */
export function fmtDuration(minutes: number, minLabel: string): string {
  if (minutes < 60) return `${minutes} ${minLabel}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
