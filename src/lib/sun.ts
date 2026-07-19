// Sunrise/sunset, computed offline with the standard NOAA solar equations
// (simplified). Accurate to a couple of minutes — plenty for planning a
// sunrise at Mather Point or beating the heat in Zion.

/** Fractional year in radians for the given date (UTC-based is fine here). */
function toJulianCentury(date: Date): number {
  const time = date.getTime() / 86400000 + 2440587.5; // Julian day
  return (time - 2451545) / 36525;
}

function sunDeclinationRad(t: number): number {
  const m = ((357.52911 + t * 35999.05029) * Math.PI) / 180; // mean anomaly
  const l0 = 280.46646 + t * 36000.76983; // mean longitude (deg)
  const c =
    (1.914602 - t * 0.004817) * Math.sin(m) + 0.019993 * Math.sin(2 * m); // equation of center
  const trueLongRad = ((l0 + c) * Math.PI) / 180;
  const obliquityRad = ((23.439 - 0.0000004 * t) * Math.PI) / 180;
  return Math.asin(Math.sin(obliquityRad) * Math.sin(trueLongRad));
}

function equationOfTimeMin(t: number): number {
  const l0 = ((280.46646 + t * 36000.76983) * Math.PI) / 180;
  const m = ((357.52911 + t * 35999.05029) * Math.PI) / 180;
  const e = 0.016708634 - t * 0.000042037;
  const y = Math.tan(((23.439 - 0.0000004 * t) * Math.PI) / 360) ** 2;
  return (
    4 *
    (180 / Math.PI) *
    (y * Math.sin(2 * l0) -
      2 * e * Math.sin(m) +
      4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
      0.5 * y * y * Math.sin(4 * l0) -
      1.25 * e * e * Math.sin(2 * m))
  );
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

/** Sunrise/sunset (as UTC Date objects) for a location on a given local date. */
export function sunTimes(lat: number, lon: number, date: Date): SunTimes {
  // Solar noon of that date, roughly
  const noonUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const t = toJulianCentury(noonUtc);
  const decl = sunDeclinationRad(t);
  const latRad = (lat * Math.PI) / 180;
  // Hour angle for the sun at -0.833° (accounts for refraction + sun radius)
  const h0 = (-0.833 * Math.PI) / 180;
  const cosH =
    (Math.sin(h0) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));
  const hourAngleDeg = (Math.acos(Math.min(1, Math.max(-1, cosH))) * 180) / Math.PI;

  const eqTime = equationOfTimeMin(t);
  const solarNoonMinUtc = 720 - 4 * lon - eqTime; // minutes after 00:00 UTC
  const riseMin = solarNoonMinUtc - hourAngleDeg * 4;
  const setMin = solarNoonMinUtc + hourAngleDeg * 4;

  const dayStartUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return {
    sunrise: new Date(dayStartUtc + riseMin * 60000),
    sunset: new Date(dayStartUtc + setMin * 60000),
  };
}

/** Formats a Date as "6:12 AM" in the given IANA timezone. */
export function fmtTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
}
