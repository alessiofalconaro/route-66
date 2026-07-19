// Geolocation helpers: find the nearest overnight city with the browser's
// free Geolocation API. Must degrade gracefully (no signal / permission denied).

export interface CityPoint {
  cityId: string; // matches Hotel.id / city segment mapping
  lat: number;
  lon: number;
}

// Approximate coordinates of the 11 overnight cities.
export const CITY_POINTS: CityPoint[] = [
  { cityId: 'chicago', lat: 41.8781, lon: -87.6298 },
  { cityId: 'stlouis', lat: 38.627, lon: -90.1994 },
  { cityId: 'springfield-mo', lat: 37.209, lon: -93.2923 },
  { cityId: 'tulsa', lat: 36.154, lon: -95.9928 },
  { cityId: 'amarillo', lat: 35.1991, lon: -101.8452 },
  { cityId: 'albuquerque', lat: 35.0844, lon: -106.6504 },
  { cityId: 'grand-canyon', lat: 36.0544, lon: -112.1401 },
  { cityId: 'springdale', lat: 37.1889, lon: -112.999 },
  { cityId: 'las-vegas', lat: 36.1147, lon: -115.1728 },
  { cityId: 'three-rivers', lat: 36.4383, lon: -118.9045 },
  { cityId: 'los-angeles', lat: 34.0522, lon: -118.2437 },
];

// Haversine formula: distance in km between two lat/lon points on Earth.
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface NearestCity {
  cityId: string;
  km: number; // distance from the user — lets the caller say "you're far away"
}

export function nearestCity(lat: number, lon: number): NearestCity {
  let best = CITY_POINTS[0];
  let bestDist = Infinity;
  for (const p of CITY_POINTS) {
    const d = distanceKm(lat, lon, p.lat, p.lon);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return { cityId: best.cityId, km: bestDist };
}

/**
 * Asks the browser for the current position, then resolves with the nearest
 * overnight city + its distance — or null on any failure (denied, timeout).
 * The caller must treat null as "no suggestion", never as an error, and
 * should check `km` before trusting the match (in Rome the nearest stop is
 * still "Chicago", 7000+ km away!).
 */
export function detectNearestCity(): Promise<NearestCity | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(nearestCity(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null), // permission denied or unavailable → just no suggestion
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
