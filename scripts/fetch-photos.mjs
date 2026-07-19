// Downloads a free (CC-licensed) lead photo from Wikipedia/Wikimedia Commons
// for each POI/hotel that has one, into public/img/poi/. Also generates:
//   - src/data/photos.ts        (id → image path, used by the cards)
//   - PHOTO_CREDITS.md          (attribution links, licensing)
// Run once with: npm run photos   (the images are committed to git so the
// app stays 100% offline — no runtime dependency on Wikipedia).
// NOTE: Google Maps photos can NOT be used: the Places Photos API requires
// billing (breaks the $0 rule) and scraping the site violates its ToS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

// POI/hotel id → English Wikipedia article whose lead image we use.
const WIKI = {
  // Chicago
  'chi-cloud-gate': 'Cloud Gate',
  'chi-navy-pier': 'Navy Pier',
  'chi-360': '875 North Michigan Avenue',
  'chi-lincoln-zoo': 'Lincoln Park Zoo',
  'chi-art-institute': 'Art Institute of Chicago',
  'chi-united-center': 'United Center',
  // Chicago → St. Louis
  'leg1-joliet': 'Joliet, Illinois',
  'leg1-dwight': "Ambler's Texaco Gas Station",
  'leg1-pontiac': 'Pontiac, Illinois',
  'leg1-bunyon': 'Atlanta, Illinois',
  // St. Louis → Springfield MO
  'leg2-arch-grounds': 'Gateway Arch',
  'leg2-arch-visitor': 'Gateway Arch National Park',
  'leg2-forest-park': 'Forest Park (St. Louis)',
  'leg2-chain-of-rocks': 'Chain of Rocks Bridge',
  'leg2-cuba-murals': 'Cuba, Missouri',
  'leg2-red-oak': 'Red Oak II',
  // Springfield → Tulsa
  'leg3-cars-route': 'Galena, Kansas',
  'leg3-blue-whale': 'Blue Whale of Catoosa',
  'leg3-cyrus-avery': 'Cyrus Avery Route 66 Memorial Bridge',
  'leg3-pops': 'Pops (restaurant)',
  'leg3-tower-theatre': 'Tower Theatre (Oklahoma City)',
  // Tulsa → Amarillo
  'leg4-paycom': 'Paycom Center',
  'leg4-cowboy-museum': 'National Cowboy & Western Heritage Museum',
  'leg4-ok66-museum': 'Oklahoma Route 66 Museum',
  'leg4-big-texan': 'Big Texan Steak Ranch',
  'leg4-cadillac-ranch': 'Cadillac Ranch',
  'leg4-midway': 'Adrian, Texas',
  'leg4-palo-duro': 'Palo Duro Canyon',
  'leg4-leaning-tower': 'Britten, Texas',
  // Amarillo → Albuquerque
  'leg5-auto-museum': 'Santa Rosa, New Mexico',
  'leg5-petroglyph': 'Petroglyph National Monument',
  'leg5-breaking-bad': 'Albuquerque, New Mexico',
  // Albuquerque → Grand Canyon
  'leg6-four-corners': 'Four Corners Monument',
  'leg6-monument-valley': 'Monument Valley',
  'leg6-horseshoe': 'Horseshoe Bend (Arizona)',
  // Grand Canyon → Springdale
  'leg7-mather': 'Mather Point',
  'leg7-yavapai': 'Yavapai Point',
  'leg7-desert-view': 'Desert View Watchtower',
  'leg7-glen-canyon': 'Glen Canyon Dam',
  // Zion
  'zion-emerald': 'Emerald Pools',
  'zion-riverside': 'Zion Canyon',
  'zion-canyon-overlook': 'Zion – Mount Carmel Highway',
  'zion-weeping-rock': 'Weeping Rock',
  'zion-viewpoints': 'Zion National Park',
  // Springdale → Las Vegas
  'leg9-atlatl': 'Valley of Fire State Park',
  'leg9-elephant': 'Valley of Fire State Park',
  'leg9-seven-magic': 'Seven Magic Mountains',
  'leg9-bellagio': 'Fountains of Bellagio',
  'leg9-caesars': 'Caesars Palace',
  'leg9-flamingo': 'Flamingo Las Vegas',
  'leg9-strip': 'Las Vegas Strip',
  // Las Vegas → Three Rivers
  'leg10-sphere': 'Sphere (venue)',
  'leg10-drive': 'Three Rivers, California',
  // Three Rivers → LA
  'leg11-sequoia': 'General Sherman (tree)',
  'leg11-santa-monica': 'Santa Monica Pier',
  // Los Angeles
  'la-griffith-obs': 'Griffith Observatory',
  'la-griffith-park': 'Griffith Park',
  'la-hollywood-sign': 'Hollywood Sign',
  'la-walk-of-fame': 'Hollywood Walk of Fame',
  'la-sunset': 'Sunset Boulevard',
  'la-getty': 'Getty Center',
  'la-rodeo': 'Rodeo Drive',
  'la-malibu': 'Malibu Pier',
  'la-venice-beach': 'Venice Beach',
  'la-venice-canals': 'Venice Canal Historic District',
  'la-marina': 'Marina del Rey',
  'la-academy-museum': 'Academy Museum of Motion Pictures',
  'la-crypto-arena': 'Crypto.com Arena',
  'la-intuit-dome': 'Intuit Dome',
  // Hotels (only the ones with a Wikipedia article)
  'las-vegas': 'Caesars Palace',
  'springfield-mo': 'Rail Haven Motel',
};

const UA = 'Route66TripCompanion/1.0 (personal trip app; github.com/alessiofalconaro/route-66)';
const outDir = new URL('../public/img/poi/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const photos = {}; // id → relative path (from the app base)
const credits = []; // for PHOTO_CREDITS.md

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with retries + exponential backoff on 429/5xx (Wikipedia rate limit). */
async function fetchRetry(url) {
  for (const wait of [0, 3000, 8000, 20000]) {
    if (wait) await sleep(wait);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res;
    if (res.status !== 429 && res.status < 500) return res; // real error, no retry
  }
  throw new Error('rate-limited after retries');
}

for (const [id, title] of Object.entries(WIKI)) {
  try {
    const res = await fetchRetry(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!res.ok) throw new Error(`summary ${res.status}`);
    const data = await res.json();
    const original = data.thumbnail?.source;
    if (!original) throw new Error('no thumbnail');
    if (/\.svg/i.test(original)) throw new Error('svg lead image');
    // Ask for a 640px-wide thumbnail; if the original is smaller that URL
    // 400s, so fall back to the size the API gave us.
    const at640 = original.replace(/\/(\d+)px-/, '/640px-');

    let img = await fetchRetry(at640);
    let src = at640;
    if (!img.ok) {
      img = await fetchRetry(original);
      src = original;
    }
    if (!img.ok) throw new Error(`image ${img.status}`);
    const ext = (src.match(/\.(jpe?g|png|webp)/i)?.[1] ?? 'jpg').toLowerCase();
    const file = `${id}.${ext}`;
    writeFileSync(new URL(file, outDir), Buffer.from(await img.arrayBuffer()));

    photos[id] = `img/poi/${file}`;
    credits.push(`- \`${file}\` — [${title}](${data.content_urls.desktop.page}) (image from Wikipedia/Wikimedia Commons; see the file page there for author & license)`);
    console.log(`ok   ${id}  ←  ${title}`);
    await sleep(600); // be polite to the API
  } catch (err) {
    console.log(`skip ${id} (${title}): ${err.message}`);
  }
}

// Generated TS module the cards import (typed, tree-shakeable).
const ts = `// AUTO-GENERATED by scripts/fetch-photos.mjs — do not edit by hand.
// POI/hotel id → bundled photo path (relative to the app base URL).
export const PHOTOS: Record<string, string> = ${JSON.stringify(photos, null, 2)};
`;
writeFileSync(new URL('../src/data/photos.ts', import.meta.url), ts);

writeFileSync(
  new URL('../PHOTO_CREDITS.md', import.meta.url),
  `# Photo credits\n\nAll POI/hotel photos are lead images from Wikipedia articles, hosted copies of\nWikimedia Commons files (Creative Commons / public domain). Follow each link\nand click the image there for the exact author and license.\n\n${credits.join('\n')}\n`,
);

console.log(`\n${Object.keys(photos).length}/${Object.keys(WIKI).length} photos downloaded.`);
