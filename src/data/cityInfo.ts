// Practical, fully-offline info per overnight city: IANA timezone (the route
// crosses Central → Mountain → Pacific, and Arizona famously skips DST),
// the state, and its interstate speed limit.
export interface CityInfo {
  tz: string; // IANA timezone — the built-in Intl API formats times with it
  state: string;
  speedLimitMph: number; // max posted interstate limit in that state
}

export const CITY_INFO: Record<string, CityInfo> = {
  chicago: { tz: 'America/Chicago', state: 'Illinois', speedLimitMph: 70 },
  stlouis: { tz: 'America/Chicago', state: 'Missouri', speedLimitMph: 70 },
  'springfield-mo': { tz: 'America/Chicago', state: 'Missouri', speedLimitMph: 70 },
  tulsa: { tz: 'America/Chicago', state: 'Oklahoma', speedLimitMph: 75 },
  amarillo: { tz: 'America/Chicago', state: 'Texas', speedLimitMph: 75 },
  albuquerque: { tz: 'America/Denver', state: 'New Mexico', speedLimitMph: 75 },
  // Arizona does NOT observe daylight saving → America/Phoenix, not Denver
  'grand-canyon': { tz: 'America/Phoenix', state: 'Arizona', speedLimitMph: 75 },
  springdale: { tz: 'America/Denver', state: 'Utah', speedLimitMph: 80 },
  'las-vegas': { tz: 'America/Los_Angeles', state: 'Nevada', speedLimitMph: 80 },
  'three-rivers': { tz: 'America/Los_Angeles', state: 'California', speedLimitMph: 70 },
  'los-angeles': { tz: 'America/Los_Angeles', state: 'California', speedLimitMph: 70 },
};
