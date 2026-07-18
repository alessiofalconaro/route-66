// Builds a plain Google Maps URL. Opens the native Maps app on phones.
// Zero API key, zero cost — this is just a link, not the Maps JavaScript API.
export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Directions link between two places (used on driving legs).
export function directionsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    from,
  )}&destination=${encodeURIComponent(to)}`;
}
