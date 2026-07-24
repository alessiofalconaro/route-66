// Bundled, read-only trip data — generated from CLAUDE.md section 8 (authoritative).
// User edits NEVER modify this file: they live in localStorage as overrides
// and are merged at runtime (see lib/overrides.ts).

import type { Hotel, FuelStop, Segment } from '../types';

// ---------------------------------------------------------------------------
// Hotels (8.1) — 16 nights total (confirmed; ignore the PDF's "18 nights")
// ---------------------------------------------------------------------------
export const HOTELS: Hotel[] = [
  {
    id: 'chicago',
    city: 'Chicago, IL',
    name: 'Home2 Suites by Hilton Chicago River North',
    nights: 'Aug 3–5',
    parking: '$67.63/day',
    mapsQuery: 'Home2 Suites by Hilton Chicago River North',
  },
  {
    id: 'stlouis',
    city: 'St. Louis, MO',
    name: 'Pear Tree Inn St. Louis Near Union Station',
    nights: 'Aug 5–6',
    parking: 'Free',
    mapsQuery: 'Pear Tree Inn St. Louis Near Union Station',
  },
  {
    id: 'springfield-mo',
    city: 'Springfield, MO',
    name: 'Best Western Route 66 Rail Haven',
    nights: 'Aug 6–7',
    parking: 'Free',
    mapsQuery: 'Best Western Route 66 Rail Haven Springfield MO',
  },
  {
    id: 'tulsa',
    city: 'Tulsa, OK',
    name: 'La Quinta Inn & Suites Owasso',
    nights: 'Aug 7–8',
    parking: 'Free',
    mapsQuery: 'La Quinta Inn & Suites Owasso OK',
  },
  {
    id: 'amarillo',
    city: 'Amarillo, TX',
    name: 'Spark by Hilton Amarillo Western Plaza',
    nights: 'Aug 8–9',
    parking: 'Free',
    mapsQuery: 'Spark by Hilton Amarillo Western Plaza',
  },
  {
    id: 'albuquerque',
    city: 'Albuquerque, NM',
    name: 'Embassy Suites by Hilton Albuquerque',
    nights: 'Aug 9–11',
    parking: '$15/day',
    mapsQuery: 'Embassy Suites by Hilton Albuquerque',
  },
  {
    id: 'grand-canyon',
    city: 'Grand Canyon Village, AZ',
    name: 'Yavapai Lodge',
    nights: 'Aug 11–12',
    parking: 'Free',
    mapsQuery: 'Yavapai Lodge Grand Canyon Village',
  },
  {
    id: 'springdale',
    city: 'Springdale, UT',
    name: 'Hyatt Place Springdale / Zion',
    nights: 'Aug 12–14',
    parking: '$20/day',
    resortFee: '$25 resort fee',
    mapsQuery: 'Hyatt Place Springdale Zion',
  },
  {
    id: 'las-vegas',
    city: 'Las Vegas, NV',
    name: 'Caesars Palace',
    nights: 'Aug 14–15',
    parking: '$20/day',
    resortFee: '~$60 resort fee',
    mapsQuery: 'Caesars Palace Las Vegas',
  },
  {
    id: 'three-rivers',
    city: 'Three Rivers, CA',
    name: 'Lazy J Ranch Motel',
    nights: 'Aug 15–16',
    parking: 'Free',
    mapsQuery: 'Lazy J Ranch Motel Three Rivers CA',
  },
  {
    id: 'los-angeles',
    city: 'Los Angeles, CA',
    name: 'Park Plaza Lodge Hotel',
    nights: 'Aug 16–19',
    parking: 'Free',
    mapsQuery: 'Park Plaza Lodge Hotel Los Angeles',
  },
];

// ---------------------------------------------------------------------------
// Fuel stops (8.3) — ~$349.40 total, split 3 ways
// ---------------------------------------------------------------------------
const FUEL: FuelStop[] = [
  {
    segmentId: 'stlouis-springfieldmo',
    station: "Sam's Club",
    address: 'Crestwood, MO',
    pricePerGal: 3.64,
    fillGal: 9.06,
    amountUsd: 32.97,
  },
  {
    segmentId: 'springfieldmo-tulsa',
    station: "Sam's Club",
    address: 'Joplin, MO',
    pricePerGal: 2.98,
    fillGal: 7.89,
    amountUsd: 23.52,
    warning: 'Cheapest fuel on the whole route — fill up here.',
  },
  {
    segmentId: 'tulsa-amarillo',
    station: 'Lucky Star Casino Travel Center',
    address: 'Calumet, OK',
    pricePerGal: 3.18,
    fillGal: 7.61,
    amountUsd: 24.21,
  },
  {
    segmentId: 'amarillo-albuquerque',
    station: 'Valero',
    address: 'Vega, TX',
    pricePerGal: 3.29,
    fillGal: 7.28,
    amountUsd: 23.94,
  },
  {
    segmentId: 'albuquerque-grandcanyon',
    station: 'Sinclair',
    address: 'Mexican Water, AZ',
    pricePerGal: 3.69,
    fillGal: 7.75,
    amountUsd: 28.58,
    warning: 'Keep the tank ABOVE 1/4 in the Four Corners area — stations are sparse.',
  },
  {
    segmentId: 'albuquerque-grandcanyon',
    station: "Speedy's",
    address: 'Cameron, AZ',
    pricePerGal: 3.83,
    fillGal: 7.56,
    amountUsd: 28.97,
  },
  {
    segmentId: 'grandcanyon-springdale',
    station: 'Arizona area (average)',
    address: 'Arizona',
    pricePerGal: 5.03,
    fillGal: 1.58,
    amountUsd: 7.94,
  },
  {
    segmentId: 'grandcanyon-springdale',
    station: "Speedy's",
    address: 'Cameron, AZ',
    pricePerGal: 3.83,
    fillGal: 10.85,
    amountUsd: 41.56,
  },
  {
    segmentId: 'springdale-lasvegas',
    station: 'Costco',
    address: 'St George, UT',
    pricePerGal: 3.87,
    fillGal: 7.41,
    amountUsd: 28.66,
  },
  {
    segmentId: 'lasvegas-threerivers',
    station: 'USA Gasoline',
    address: 'Barstow, CA',
    pricePerGal: 5.29,
    fillGal: 8.2,
    amountUsd: 43.4,
    warning: '⚠️ California prices — fill the tank FULL before entering California.',
  },
  {
    segmentId: 'lasvegas-threerivers',
    station: 'Fastrip',
    address: 'Bakersfield, CA',
    pricePerGal: 5.17,
    fillGal: 9.01,
    amountUsd: 46.58,
    warning: '⚠️ California prices',
  },
  {
    segmentId: 'threerivers-losangeles',
    station: 'Los Angeles area',
    address: 'Los Angeles, CA',
    pricePerGal: 5.99,
    fillGal: 3.18,
    amountUsd: 19.07,
    warning: '⚠️ California prices',
  },
];

export const FUEL_TOTAL_USD = 349.4;

// Small helper so each POI line below stays short and readable.
function poi(
  id: string,
  name: string,
  city: string,
  category: Segment['pois'][number]['category'],
  mapsQuery: string,
  dwellMinutes?: number,
  note?: string,
) {
  return { id, name, city, category, mapsQuery, dwellMinutes, note };
}

// Standard caveat for every NBA stop (trip is in August = offseason).
const NBA_NOTE =
  'August = NBA offseason: verify store/tour hours and jersey stock before going. New-season jerseys may not be out yet.';

// ---------------------------------------------------------------------------
// Segments (8.2) — cities and driving legs, in trip order
// ---------------------------------------------------------------------------
export const SEGMENTS: Segment[] = [
  {
    id: 'chicago',
    kind: 'city',
    label: 'Chicago',
    dates: 'Aug 3–5',
    hotelId: 'chicago',
    pois: [
      poi('chi-r66-sign', 'Begin Historic Route 66 sign', 'Chicago, IL', 'photo', 'Route 66 Begin sign Adams Street Chicago', 15),
      poi('chi-cloud-gate', 'Millennium Park / Cloud Gate', 'Chicago, IL', 'city', 'Cloud Gate Millennium Park Chicago', 45),
      poi('chi-navy-pier', 'Navy Pier', 'Chicago, IL', 'city', 'Navy Pier Chicago', 60),
      poi('chi-360', '360 Chicago / John Hancock', 'Chicago, IL', 'city', '360 Chicago Observation Deck', 60),
      poi('chi-lincoln-zoo', 'Lincoln Park Zoo', 'Chicago, IL', 'nature', 'Lincoln Park Zoo Chicago', 90, 'Free entry'),
      poi('chi-art-institute', 'Art Institute of Chicago', 'Chicago, IL', 'museum', 'Art Institute of Chicago', 150),
      poi('chi-united-center', 'United Center + Michael Jordan statue', 'Chicago, IL', 'nba', 'United Center Chicago', 60, `Bulls arena. "The Spirit" MJ statue on the east plaza, free photo op. ${NBA_NOTE}`),
      poi('chi-bulls-store', 'Bulls team store', 'Chicago, IL', 'nba', 'Chicago Bulls team store United Center', 30, NBA_NOTE),
      poi('chi-r66-end-sign', 'End Historic Route 66 sign', 'Chicago, IL', 'photo', 'End Historic Route 66 sign Jackson Boulevard Chicago', 10, 'Jackson Blvd, one block south of the Begin sign.'),
      poi('chi-r66-new-begin', 'New Route 66 Begin sign', 'Chicago, IL', 'photo', '41.89121,-87.60923', 10, 'Near Navy Pier — pair it with the evening walk.'),
      poi('chi-river-cruise', 'Chicago River architecture cruise', 'Chicago, IL', 'city', '41.88921,-87.62442', 120, 'Meeting point at Michigan Ave / Wacker. Book the ~10:00 AM cruise ahead; be there 30 min early. ~90 min on the water.'),
      poi('chi-theatre', 'The Chicago Theatre', 'Chicago, IL', 'photo', 'The Chicago Theatre', 15, 'Iconic marquee — exterior photo stop. Inside only via the guided tour (usually noon, select days).'),
      poi('chi-starbucks-reserve', 'Starbucks Reserve Roastery', 'Chicago, IL', 'food', 'Starbucks Reserve Roastery Chicago', 45, 'Optional — world’s largest Starbucks (5 floors) on Michigan Ave, only if passing by.'),
      poi('chi-nutella-cafe', 'Nutella Cafe', 'Chicago, IL', 'food', 'Nutella Cafe Chicago', 40, 'Optional — sweet break near Millennium Park, only if passing by.'),
      poi('chi-alice-wonder', 'Alice & Wonder – State', 'Chicago, IL', 'other', 'Alice and Wonder State Street Chicago', 30, 'Chicago souvenir & apparel boutique near the hotel.'),
      poi('chi-hertz-pickup', 'Hertz — car pickup (Aug 5)', 'Chicago, IL', 'other', 'Hertz Car Rental - Chicago - West Washington Street', 30, 'Rental pickup Aug 5 ~9:00 AM. ~5 min taxi (or ~20 min walk) from the hotel; United Center is then on the way out of the city.'),
    ],
  },
  {
    id: 'chicago-stlouis',
    kind: 'leg',
    label: 'Chicago → St. Louis',
    dates: 'Day 1 · Aug 5',
    distanceMiles: 300,
    hotelId: 'stlouis',
    pois: [
      poi('leg1-joliet', 'Joliet (Route 66 stop)', 'Joliet, IL', 'route66', 'Route 66 Park Joliet IL', 20),
      poi('leg1-dwight', 'Dwight (historic gas station)', 'Dwight, IL', 'route66', "Ambler's Texaco Gas Station Dwight IL", 20),
      poi('leg1-pontiac', 'Pontiac Oakland Auto Museum', 'Pontiac, IL', 'museum', 'Pontiac Oakland Automobile Museum', 60),
      poi('leg1-bunyon', 'Atlanta Bunyon Giant', 'Atlanta, IL', 'photo', 'Bunyon Giant Atlanta IL', 20),
      poi('leg1-lauterbach', 'Lauterbach Muffler Man', 'Springfield, IL', 'photo', 'Lauterbach Giant Springfield IL', 20),
    ],
  },
  {
    id: 'stlouis-springfieldmo',
    kind: 'leg',
    label: 'St. Louis → Springfield MO',
    dates: 'Day 2 · Aug 6',
    distanceMiles: 230,
    hotelId: 'springfield-mo',
    pois: [
      poi('leg2-arch-grounds', 'Gateway Arch grounds', 'St. Louis, MO', 'photo', 'Gateway Arch St. Louis', 30),
      poi('leg2-arch-visitor', 'Gateway Arch NP visitor center', 'St. Louis, MO', 'museum', 'Gateway Arch National Park Visitor Center', 30),
      poi('leg2-forest-park', 'Forest Park', 'St. Louis, MO', 'nature', 'Forest Park St. Louis', 30),
      poi('leg2-chain-of-rocks', 'Old Chain of Rocks Bridge', 'St. Louis, MO', 'route66', 'Old Chain of Rocks Bridge', 30, 'Walk on the old Route 66 Mississippi crossing'),
      poi('leg2-cuba-murals', 'Murals of Cuba', 'Cuba, MO', 'photo', 'Route 66 murals Cuba Missouri', 30),
      poi('leg2-red-oak', 'Red Oak II ghost town', 'Carthage, MO', 'route66', 'Red Oak II Carthage MO', 30),
    ],
  },
  {
    id: 'springfieldmo-tulsa',
    kind: 'leg',
    label: 'Springfield MO → Tulsa',
    dates: 'Day 3 · Aug 7',
    distanceMiles: 190,
    hotelId: 'tulsa',
    pois: [
      poi('leg3-tristate', 'OK-KS-MO Tri-State Marker', 'Joplin, MO', 'photo', 'Tri-State Marker Oklahoma Kansas Missouri', 10),
      poi('leg3-cars-route', 'Cars on the Route', 'Galena, KS', 'route66', 'Cars on the Route Galena KS', 15, 'Inspiration for Pixar\'s "Cars" — brief stop'),
      poi('leg3-blue-whale', 'Blue Whale of Catoosa', 'Catoosa, OK', 'photo', 'Blue Whale of Catoosa', 30),
      poi('leg3-cyrus-avery', 'Cyrus Avery Centennial Plaza', 'Tulsa, OK', 'route66', 'Cyrus Avery Centennial Plaza Tulsa', 30),
      poi('leg3-pops', 'Pops 66', 'Arcadia, OK', 'food', 'Pops 66 Arcadia OK', 45, 'Hundreds of soda flavors under the giant bottle'),
      poi('leg3-tower-theatre', 'Tower Theatre (exterior)', 'Oklahoma City, OK', 'photo', 'Tower Theatre Oklahoma City', 15),
    ],
  },
  {
    id: 'tulsa-amarillo',
    kind: 'leg',
    label: 'Tulsa → Amarillo',
    dates: 'Day 4 · Aug 8',
    distanceMiles: 370,
    hotelId: 'amarillo',
    pois: [
      poi('leg4-paycom', 'Paycom Center + Thunder Shop', 'Oklahoma City, OK', 'nba', 'Paycom Center Oklahoma City', 60, `Thunder arena, morning stop (OKC is on the I-44/I-40 route). ${NBA_NOTE}`),
      poi('leg4-cowboy-museum', 'National Cowboy & Western Heritage Museum', 'Oklahoma City, OK', 'museum', 'National Cowboy and Western Heritage Museum', 60),
      poi('leg4-ok66-museum', 'Oklahoma Route 66 Museum', 'Clinton, OK', 'museum', 'Oklahoma Route 66 Museum Clinton', 60),
      poi('leg4-big-texan', 'Big Texan Steak Ranch', 'Amarillo, TX', 'food', 'Big Texan Steak Ranch Amarillo', 60, 'Home of the 72 oz steak challenge'),
      poi('leg4-cadillac-ranch', 'Cadillac Ranch', 'Amarillo, TX', 'route66', 'Cadillac Ranch Amarillo', 45, 'Bring spray paint!'),
      poi('leg4-midway', 'Midway Point of Route 66', 'Adrian, TX', 'photo', 'Route 66 Midpoint Adrian Texas', 15),
      poi('leg4-palo-duro', 'Palo Duro Canyon State Park', 'Canyon, TX', 'nature', 'Palo Duro Canyon State Park', 180),
      poi('leg4-leaning-tower', 'Leaning Tower of Texas', 'Groom, TX', 'photo', 'Leaning Tower of Texas Groom', 20),
    ],
  },
  {
    id: 'amarillo-albuquerque',
    kind: 'leg',
    label: 'Amarillo → Albuquerque',
    dates: 'Day 5–6 · Aug 9–10',
    distanceMiles: 290,
    hotelId: 'albuquerque',
    pois: [
      poi('leg5-auto-museum', 'Route 66 Auto Museum', 'Santa Rosa, NM', 'museum', 'Route 66 Auto Museum Santa Rosa NM', 60),
      poi('leg5-petroglyph', 'Petroglyph National Monument', 'Albuquerque, NM', 'nature', 'Petroglyph National Monument', 90),
      poi('leg5-breaking-bad', 'Breaking Bad tour', 'Albuquerque, NM', 'photo', 'Breaking Bad RV Tours Albuquerque', 60),
    ],
  },
  {
    id: 'albuquerque-grandcanyon',
    kind: 'leg',
    label: 'Albuquerque → Grand Canyon (via Four Corners)',
    dates: 'Day 7 · Aug 11',
    distanceMiles: 500,
    driveHours: 9.5,
    hotelId: 'grand-canyon',
    warning:
      'LONGEST DAY: ~500 mi, 9–10 h with stops. Start early, keep the tank above 1/4 — fuel stations are sparse around Four Corners / Monument Valley. Desert heat: carry ~1 gallon of water per person.',
    pois: [
      poi('leg6-four-corners', 'Four Corners Monument', 'Teec Nos Pos, AZ', 'photo', 'Four Corners Monument', 30, 'Stand in 4 states at once'),
      poi('leg6-monument-valley', 'Monument Valley / Forrest Gump Point', 'Oljato-Monument Valley, AZ', 'nature', 'Forrest Gump Point Monument Valley', 120, 'Scenic drive + the famous highway photo'),
      poi('leg6-horseshoe', 'Horseshoe Bend', 'Page, AZ', 'nature', 'Horseshoe Bend Page AZ', 60, 'Short hike (~1.5 mi round trip), no shade — bring water'),
    ],
  },
  {
    id: 'grandcanyon-springdale',
    kind: 'leg',
    label: 'Grand Canyon → Springdale UT',
    dates: 'Day 8 · Aug 12',
    distanceMiles: 200,
    hotelId: 'springdale',
    pois: [
      poi('leg7-mather', 'Mather Point (South Rim)', 'Grand Canyon Village, AZ', 'nature', 'Mather Point Grand Canyon', 60),
      poi('leg7-yavapai', 'Yavapai Point (South Rim)', 'Grand Canyon Village, AZ', 'nature', 'Yavapai Point Grand Canyon', 60),
      poi('leg7-desert-view', 'Desert View Watchtower', 'Grand Canyon Village, AZ', 'nature', 'Desert View Watchtower Grand Canyon', 60, 'South Rim viewpoints: 3–4 h total'),
      poi('leg7-glen-canyon', 'Glen Canyon Dam overlook', 'Page, AZ', 'photo', 'Glen Canyon Dam Overlook', 45),
    ],
  },
  {
    id: 'zion-day',
    kind: 'city',
    label: 'Zion National Park (park day)',
    dates: 'Day 9 · Aug 13',
    hotelId: 'springdale',
    warning:
      'Zion shuttle is MANDATORY Apr–Oct (no private cars on the scenic drive). Arrive 7–8 AM to beat lines and heat.',
    pois: [
      poi('zion-emerald', 'Emerald Pools Trail', 'Springdale, UT', 'nature', 'Emerald Pools Trail Zion', 180),
      poi('zion-riverside', 'Riverside Walk', 'Springdale, UT', 'nature', 'Riverside Walk Zion', 60),
      // NOTE: Weeping Rock removed — the trail has been closed since the 2019
      // rockfall and remains closed indefinitely.
      poi('zion-canyon-overlook', 'Canyon Overlook Trail', 'Springdale, UT', 'nature', 'Canyon Overlook Trail Zion', 60),
      poi('zion-viewpoints', 'Scenic viewpoints', 'Springdale, UT', 'photo', 'Zion Canyon Scenic Drive', 60),
    ],
  },
  {
    id: 'springdale-lasvegas',
    kind: 'leg',
    label: 'Springdale → Las Vegas',
    dates: 'Day 10 · Aug 14',
    distanceMiles: 165,
    hotelId: 'las-vegas',
    pois: [
      poi('leg9-atlatl', 'Atlatl Rock (Valley of Fire)', 'Overton, NV', 'nature', 'Atlatl Rock Valley of Fire', 30),
      poi('leg9-elephant', 'Elephant Rock (Valley of Fire)', 'Overton, NV', 'nature', 'Elephant Rock Valley of Fire', 30),
      poi('leg9-seven-magic', 'Seven Magic Mountains', 'Las Vegas, NV', 'photo', 'Seven Magic Mountains Las Vegas', 30),
      poi('leg9-bellagio', 'Fountains of Bellagio', 'Las Vegas, NV', 'city', 'Fountains of Bellagio', 30, 'Free show'),
      poi('leg9-caesars', 'Caesars Palace', 'Las Vegas, NV', 'city', 'Caesars Palace Las Vegas', 30, "Tonight's hotel — walk the casino floor"),
      poi('leg9-flamingo', 'Flamingo Las Vegas', 'Las Vegas, NV', 'city', 'Flamingo Las Vegas', 20),
      poi('leg9-strip', 'Las Vegas Strip evening walk', 'Las Vegas, NV', 'city', 'Las Vegas Strip', 90),
    ],
  },
  {
    id: 'lasvegas-threerivers',
    kind: 'leg',
    label: 'Las Vegas → Three Rivers CA',
    dates: 'Day 11 · Aug 15',
    distanceMiles: 325,
    hotelId: 'three-rivers',
    warning: '⚠️ Fill the tank FULL before entering California — gas jumps to $5+/gal.',
    pois: [
      poi('leg10-sphere', 'Sphere Las Vegas (exterior)', 'Las Vegas, NV', 'photo', 'Sphere Las Vegas', 20),
      poi('leg10-drive', 'Drive to Three Rivers / Sequoia gateway', 'Three Rivers, CA', 'route66', 'Three Rivers CA', undefined, 'Mostly a driving day across the Mojave'),
    ],
  },
  {
    id: 'threerivers-losangeles',
    kind: 'leg',
    label: 'Three Rivers / Sequoia → Los Angeles',
    dates: 'Day 12 · Aug 16',
    distanceMiles: 200,
    hotelId: 'los-angeles',
    pois: [
      poi('leg11-sequoia', 'Sequoia National Park', 'Three Rivers, CA', 'nature', 'Sequoia National Park General Sherman Tree', 240, 'Giant sequoias — General Sherman Tree'),
      poi('leg11-santa-monica', 'Santa Monica Pier — "End of Route 66" sign', 'Los Angeles, CA', 'route66', 'Santa Monica Pier End of Route 66 sign', 60, 'The official end of the Mother Road!'),
      poi('leg11-celebration', 'Arrival celebration', 'Los Angeles, CA', 'other', 'Santa Monica Pier', undefined, 'You made it — Chicago to LA!'),
    ],
  },
  {
    id: 'los-angeles',
    kind: 'city',
    label: 'Los Angeles',
    dates: 'Aug 16–19',
    hotelId: 'los-angeles',
    pois: [
      poi('la-griffith-obs', 'Griffith Observatory', 'Los Angeles, CA', 'city', 'Griffith Observatory', 120, 'Best at sunset'),
      poi('la-griffith-park', 'Griffith Park', 'Los Angeles, CA', 'nature', 'Griffith Park Los Angeles', 60),
      poi('la-hollywood-sign', 'Hollywood Sign viewpoints', 'Los Angeles, CA', 'photo', 'Hollywood Sign viewpoint', 60),
      poi('la-walk-of-fame', 'Hollywood Walk of Fame', 'Los Angeles, CA', 'city', 'Hollywood Walk of Fame', 60),
      poi('la-sunset', 'Sunset Blvd', 'Los Angeles, CA', 'city', 'Sunset Boulevard Los Angeles', 30),
      poi('la-getty', 'Getty Center', 'Los Angeles, CA', 'museum', 'Getty Center', 150, 'Free entry, paid parking'),
      poi('la-rodeo', 'Beverly Hills / Rodeo Drive', 'Los Angeles, CA', 'city', 'Rodeo Drive Beverly Hills', 60),
      poi('la-malibu', 'Malibu Pier', 'Los Angeles, CA', 'nature', 'Malibu Pier', 60),
      poi('la-venice-beach', 'Venice Beach', 'Los Angeles, CA', 'city', 'Venice Beach', 60),
      poi('la-venice-canals', 'Venice Canals', 'Los Angeles, CA', 'photo', 'Venice Canals', 30),
      poi('la-marina', 'Marina del Rey', 'Los Angeles, CA', 'city', 'Marina del Rey', 30),
      poi('la-academy-museum', 'Academy Museum of Motion Pictures', 'Los Angeles, CA', 'museum', 'Academy Museum of Motion Pictures', 150),
      poi('la-crypto-arena', 'Crypto.com Arena + Star Plaza statues', 'Los Angeles, CA', 'nba', 'Crypto.com Arena Star Plaza', 60, `Lakers arena. Statues of Kobe, Magic, Kareem, Shaq, Jerry West, Elgin Baylor outside. Lakers team store. ${NBA_NOTE}`),
      poi('la-intuit-dome', 'Intuit Dome + Clippers store', 'Los Angeles, CA', 'nba', 'Intuit Dome Inglewood', 60, `Clippers arena (opened 2024), in Inglewood near LAX — perfect on the way to the LAX car drop-off. ${NBA_NOTE}`),
      poi('la-lax-car-return', 'LAX Rental Car Return Center — drop-off (Aug 19)', 'Los Angeles, CA', 'other', 'LAX RENTAL CAR RETURN CENTER', 30, 'Return the Hertz car here Aug 19, then shuttle to the terminal — allow extra time before the flight. Intuit Dome is nearby on the way.'),
    ],
  },
];

// Attach fuel stops to their segments (kept separate above for readability).
for (const seg of SEGMENTS) {
  const stops = FUEL.filter((f) => f.segmentId === seg.id);
  if (stops.length > 0) seg.fuelStops = stops;
}

export const ALL_FUEL_STOPS = FUEL;

export function hotelById(id: string | undefined): Hotel | undefined {
  return HOTELS.find((h) => h.id === id);
}

export function segmentById(id: string | undefined): Segment | undefined {
  return SEGMENTS.find((s) => s.id === id);
}

// Overnight cities for the "In a city" dropdown. The city view aggregates
// the hotel + every POI whose `city` matches, across all segments.
export interface CityEntry {
  id: string; // matches Hotel.id and lib/geo.ts CITY_POINTS
  label: string; // "Chicago, IL"
}

export const CITIES: CityEntry[] = HOTELS.map((h) => ({ id: h.id, label: h.city }));

// Legs for the "Driving A → B" dropdown (trip order).
export const LEGS: Segment[] = SEGMENTS.filter((s) => s.kind === 'leg');

// Map an overnight-city id to its "home" segment if a dedicated one exists
// (Chicago and LA have full city segments; Springdale has the Zion park day).
export const CITY_SEGMENT: Record<string, string> = {
  chicago: 'chicago',
  springdale: 'zion-day',
  'los-angeles': 'los-angeles',
};
