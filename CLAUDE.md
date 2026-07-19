# CLAUDE.md — Route 66 Trip Companion (PWA)

> This file is the source of truth for Claude Code when building this project.
> Read it fully before writing any code. If something here conflicts with a later
> user instruction in chat, the chat instruction wins, but flag the conflict first.

---

## 0. HARD CONSTRAINTS (never violate)

1. **Total running cost = $0.** No paid APIs, no billing-enabled Google Maps JS API, no paid hosting, no paid database. If a feature can only be built with a paid service, stop and ask the human for an alternative.
2. **Mobile-first, offline-capable.** The primary device is a phone used on a US road trip with long stretches of no cell signal (western New Mexico, Arizona deserts, Nevada). The core of the app MUST work with zero connectivity. Online-only features (e.g. the chatbot) are enhancements, never the backbone.
3. **No secrets ever reach the client or the repo.** The Groq API key lives ONLY inside the Cloudflare Worker as an encrypted secret. It is never in the React app, never in a `.env` that gets bundled, never committed to git. See section 9b (Security) — this is a hard requirement, the human is specifically worried about key leaks.
4. **Free-tier only, no billing attached anywhere.** Groq, Cloudflare Workers, and GitHub Pages must all be used on plans with NO credit card / no billing enabled. This means the worst possible outcome of any abuse is rate-limiting, never a bill.
5. **The human is learning.** See section 11. Explain non-obvious code, prefer clarity over cleverness.

---

## 1. Purpose & context

Three friends (Alessio + Jesse + one more) drive Route 66 from Chicago to Los Angeles, **5–19 August 2026**, in a one-way Hertz rental (Chicago pickup, LAX drop-off). This app is their in-car companion: one place for the whole itinerary, hotels, fuel plan, points of interest, maps, and a light AI assistant.

**Core interaction the human wants:**
- Tell the app "we are in Chicago" or "we are driving Chicago → St. Louis"
- The app shows what to see there / along that leg: POIs, a one-tap Google Maps link for each, a photo, dwell time, and notes.
- The itinerary is **editable**: reorder, add, remove stops.

The full trip data is in section 8 below and also as three PDFs the human will drop into `/docs/` (`Itinerary`, `Hotels`, `Fuel_Report`). Section 8 is authoritative; use the PDFs only to double-check.

---

## 2. Tech stack

Stack is LOCKED (the human confirmed these). Chosen for: $0 cost, offline support, GitHub Pages hosting, and being easy for Claude Code to build and for a Java developer to read.

| Layer | Choice | Why |
|---|---|---|
| Framework | **React + Vite + TypeScript** (LOCKED) | Simplest reliable path to a static offline PWA on GitHub Pages. The human explicitly does NOT want Angular / job practice, they want the most convenient option. TS types will feel natural coming from Java. |
| Styling | **Tailwind CSS** | Fast, no separate CSS files, easy for an LLM to produce consistently. |
| Languages (i18n) | **English + Spanish**, toggle stored in localStorage | UI strings translated EN/ES; place names stay in English (proper nouns). Use a simple typed dictionary `{ en: {...}, es: {...} }` (lightweight) or `react-i18next` (also free/open source). Default language English, remember the last choice. |
| PWA / offline | **vite-plugin-pwa** (Workbox under the hood) | Installable app, offline caching of the app shell + trip data. |
| State / storage | React state + **localStorage** (via a small typed wrapper) | No backend needed. User edits persist on-device. |
| Maps | **Plain Google Maps URL links** (`https://www.google.com/maps/search/?api=1&query=...`) | Opens the native Maps app, zero API key, zero cost. Do NOT use the Google Maps JavaScript/Places API (needs billing). |
| Photos | Curated images bundled in `/public/img/` and/or **Wikimedia Commons** URLs (CC-licensed, keep attribution) | No paid image API (no Google Places Photos, no Unsplash key). |
| Chatbot | **Groq free API** (open model, e.g. Llama 3.x / Qwen) via a **Cloudflare Worker** proxy, with a static offline fallback | Free, fast, open model. Key hidden in the Worker. Offline = pre-generated "extra ideas". See sections 9 and 9b. |
| Hosting | **GitHub Pages** | Free static hosting. Configure Vite `base` for the repo subpath. |

---

## 3. Architecture

- **Single-page static PWA.** No server, no auth, no database.
- **Data flow:** `tripData.ts` (bundled, read-only source of truth, generated from section 8) → merged at runtime with a `userOverrides` object in localStorage (added/edited/removed/reordered stops) → rendered.
- **Offline backbone:** the app shell, all trip data, all bundled photos, and pre-generated "segment guides" (see 9) are cached by the service worker on first load, so the whole thing works with the phone in airplane mode.
- **Location awareness:** use the browser Geolocation API to detect the nearest city/segment and auto-suggest the relevant view. Always allow manual override ("we are in X" / "we are driving X → Y" pickers). Geolocation must degrade gracefully with no signal.
- **Export/import:** a button to export the current (edited) itinerary as a JSON file and to import one, so the three travelers can share a single edited version by passing a file. This is the deliberate choice instead of real cross-device sync (sync would need a backend and break the $0 / no-secrets rule).

---

## 4. Core features (build these first)

1. **Home / "Where are we?"** Two controls: `In a city` (dropdown of overnight cities) and `Driving A → B` (dropdown of legs). Auto-preselect via Geolocation when available.
2. **City view:** list of in-city POIs. Each POI card = name, category icon, photo, dwell time, note, and a **"Open in Google Maps"** button.
3. **Leg view:** same, but POIs along that driving segment, in travel order, plus the fuel stop(s) for that leg (from section 8 fuel data) and the night's hotel.
4. **Itinerary editor:** add / edit / remove / reorder stops; edits persist in localStorage; reset-to-default button.
5. **Hotels screen:** per-night hotel, parking cost, resort fees, Google Maps link (data in section 8).
6. **Fuel screen:** the planned fuel stops, price/gal, state-by-state price notes, "fill FULL before California" warning (data in section 8).

---

## 5. Additional features

**Travelers list + local identity — CONFIRMED.** No login / no auth / no accounts. Two simple pieces, both editable at any time from Settings (so a typo in a name is fixed on the spot, no reinstall):
- A travelers config list (e.g. `["Falco", "Jesse", "<third>"]`), stored in localStorage and editable in Settings (rename any of the three). It is used wherever a person must be chosen, e.g. the "who paid" dropdown in the expense splitter. Renaming a traveler must update existing references (e.g. expenses keep pointing to the same person by a stable internal `id`, with the display name resolved from the list, so a rename never corrupts past entries).
- A per-device **"who am I"** selection: on first launch the user picks which of the travelers is using this phone; changeable later in Settings. Stored in localStorage. NOT used for expense attribution (expenses stay single-writer); today essentially cosmetic (e.g. a greeting), kept as a cheap hook for future per-user features. Zero backend.

**CONFIRMED (build these):**

- **Expense splitter (single writer).** Only Alessio ("Falco") records expenses, on his device. This removes all export/merge complexity. Each expense = `payer` (chosen from the travelers list; can be anyone, e.g. Jesse when Jesse paid), `amount`, `category`, `note`, `date`. The app computes who owes whom using **proportional shares**: only the payer's own 1/3 share offsets what they are owed, NOT the full amount they paid. Example: Jesse pays a $150 hotel for all three; his own share is $50, so the other two owe him $50 each and the app credits Jesse $100 net. Show a running "net balance per person" summary. Store in localStorage. An optional export button (plain backup / to show the others) is fine, but there is NO import-merge flow and no multi-device expense sync, by the human's choice.
- **Shared photo & video album (link-only, NO in-app hosting).** The three travelers share trip photos and videos via a single **shared Google Photos album** (chosen: two iPhones + one Samsung; Google Photos is the cross-platform fit, iCloud rejected as fiddly here). The album is set to **invite-only** (specific people), NOT "anyone with the link", so access is controlled by Google, not left open. Google Photos already handles: upload from iPhone + Samsung, everyone sees everything, per-item "who added it" attribution, video, automatic sync, and enough free storage. The app does NOT store or host any media. It provides: a prominent "Open our trip album" button (deep link to the configurable album URL), and optionally a per-city / per-leg shortcut to that album. Rationale: hosting user photos/videos in-app would require a backend with real storage, break the $0 / no-billing / no-backend / offline rules, and make the human legally responsible for others' media.

**OPTIONAL (propose, build only if there is time):**

- **Camp Snap Pro shot log.** Context: one traveler (Alessio only) uses a **Camp Snap CS-Pro**, a screen-free 16MP digital camera with 4GB built-in memory (~500 photos, no SD card, no rolls), photos transferred later via USB-C to phone/computer. Because it has no screen, you can't see shots until transfer. A LIGHT optional log = per-entry `location` (auto-suggested from current segment), `subject`, `note`, to help caption photos after offload. Do NOT build roll/frame counters or "spare roll" logic (wrong model, it's built-in memory). This is a personal, single-user, offline, localStorage feature. Low priority; drop if not wanted. Note: the CS-Pro is not a video camera in its specs, so trip videos come from the travelers' phones into the shared album, not from this camera.
- **Weather-by-stop reminder** using the itinerary's own temperature warnings (desert 38–49°C, hydration = 1 gallon/person/day). Static warnings, no API needed.
- **Pre-departure checklist:** International Driving Permit, physical chip+PIN Visa/Mastercard with international transactions enabled (neobank cards not accepted at the counter), additional-driver fee note for Jesse, America the Beautiful NP pass ($80).
- **Fuel range guard:** "never below 1/4 tank in the Four Corners / Monument Valley / Horseshoe Bend area, stations are sparse."
- **Emergency screen:** 911, roadside assistance, Italian Consulate LA +1 (310) 820-0622, Embassy DC +1 (202) 612-4400. Must work offline.

---

## 6. NBA stops (NEW — add these to the trip data)

The travelers want to visit the home arena of every NBA team on the route, buy a jersey per team plus souvenirs, and see the Michael Jordan statue in Chicago. Add these as POIs (category: `nba`).

> **Reality check to surface in the app (offseason caveat):** the trip is in **August**, which is the **NBA offseason** — no games, and arena tours / team-store hours are often reduced or seasonal. New-season jerseys sometimes aren't stocked until September/October, so August stock may be previous-season. The app should show a "verify hours & stock before going" note on each NBA card. Four teams' jerseys × 3 people is a real budget line, flag it in the expense feature.

**Chicago — Bulls**
- **United Center**, 1901 W Madison St, Chicago. Home of the Bulls (and Blackhawks). West of downtown, so a small detour from the Route 66 start / downtown POIs.
- **Michael Jordan "The Spirit" statue** at the United Center statue plaza (east side). Free photo op.
- Bulls team store at the arena for jerseys/souvenirs (verify offseason hours).

**Oklahoma — Thunder**
- **Paycom Center**, 100 W Reno Ave, Oklahoma City. Home of the Thunder. Thunder Shop team store.
- **Routing (CONFIRMED):** OKC is ~160 km west of Tulsa and sits on the Tulsa → Amarillo leg (Day 4) via I-44 then I-40. The Thunder stop and the other OKC POIs are placed on that leg (already reflected in section 8.2).

**Los Angeles — Lakers AND Clippers**
- **Crypto.com Arena** (ex-Staples Center), 1111 S Figueroa St, downtown LA. Home of the Lakers. **Star Plaza statues** outside (Kobe Bryant, Magic Johnson, Kareem Abdul-Jabbar, Shaquille O'Neal, Jerry West, Elgin Baylor, plus Gretzky/De La Hoya). Lakers team store.
- **Intuit Dome**, Inglewood. Home of the Clippers (opened 2024). Clippers team store. **Placement (CONFIRMED):** Intuit Dome is in Inglewood near LAX, so place it on the final day / on the way to the LAX car drop-off.

---

## 7. Data model (TypeScript)

```ts
type Category =
  | 'route66' | 'nature' | 'museum' | 'photo' | 'food'
  | 'city' | 'nba' | 'fuel' | 'hotel' | 'other';

interface Poi {
  id: string;
  name: string;
  city: string;          // e.g. "Chicago, IL"
  category: Category;
  dwellMinutes?: number; // e.g. 45
  note?: string;
  mapsQuery: string;     // used to build the Google Maps URL
  photo?: string;        // /img/... path or Wikimedia URL
}

interface Hotel {
  id: string;
  city: string;
  name: string;
  nights: string;        // "Aug 5–6"
  parking: string;       // "Free" | "$67.63/day"
  resortFee?: string;
  mapsQuery: string;
}

interface FuelStop {
  segmentId: string;
  station: string;
  address: string;
  pricePerGal: number;
  fillGal: number;
  amountUsd: number;
  warning?: string;      // e.g. "California prices, fill FULL before entering CA"
}

interface Segment {         // a driving leg OR an overnight city
  id: string;               // "chicago" or "chicago-stlouis"
  kind: 'city' | 'leg';
  label: string;            // "Chicago" or "Chicago → St. Louis"
  dates?: string;
  distanceMiles?: number;
  driveHours?: number;
  pois: Poi[];
  fuelStops?: FuelStop[];   // for legs
  hotelId?: string;         // the night's hotel
}
```

Build a helper `mapsUrl(query: string)` that returns
`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`.

---

## 8. TRIP DATA (authoritative)

Reconcile any discrepancy with section 13 before treating a value as final.

### 8.1 Overnight cities

| # | City | Dates | Hotel | Parking |
|---|---|---|---|---|
| 1 | Chicago, IL | Aug 3–5 | Home2 Suites by Hilton Chicago River North | $67.63/day |
| 2 | St. Louis, MO | Aug 5–6 | Pear Tree Inn St. Louis Near Union Station | Free |
| 3 | Springfield, MO | Aug 6–7 | Best Western Route 66 Rail Haven | Free |
| 4 | Tulsa, OK | Aug 7–8 | La Quinta Inn & Suites Owasso | Free |
| 5 | Amarillo, TX | Aug 8–9 | Spark by Hilton Amarillo Western Plaza | Free |
| 6 | Albuquerque, NM | Aug 9–11 | Embassy Suites by Hilton Albuquerque | $15/day |
| 7 | Grand Canyon Village, AZ | Aug 11–12 | Yavapai Lodge | Free |
| 8 | Springdale, UT | Aug 12–14 | Hyatt Place Springdale / Zion | $20/day + $25 resort fee |
| 9 | Las Vegas, NV | Aug 14–15 | Caesars Palace | $20/day + ~$60 resort fee |
| 10 | Three Rivers, CA | Aug 15–16 | Lazy J Ranch Motel | Free |
| 11 | Los Angeles, CA | Aug 16–19 | Park Plaza Lodge Hotel | Free |

**Nights = 16 (CONFIRMED by the human).** The budget line in the PDF that said "18 nights" is wrong; use 16.

### 8.2 POIs by segment

**Chicago (city, Aug 3–5)**
Begin Historic Route 66 sign (photo, 15m) · Millennium Park / Cloud Gate (45m) · Navy Pier (1h) · 360 Chicago / John Hancock (1h) · Lincoln Park Zoo (free, 1.5h) · Art Institute of Chicago (2–3h) · **United Center + Michael Jordan statue [nba]** · **Bulls team store [nba]**

**Leg: Chicago → St. Louis (Day 1, Aug 5, ~300 mi)**
Joliet (20m) · Dwight (20m) · Pontiac Oakland Auto Museum (1h) · Atlanta Bunyon Giant (photo, 20m) · Lauterbach Muffler Man (photo, 20m)

**Leg: St. Louis → Springfield MO (Day 2, Aug 6, ~230 mi)**
Gateway Arch grounds (30m) · Gateway Arch NP visitor center (30m) · Forest Park (30m) · Old Chain of Rocks Bridge (walk, 30m) · Murals of Cuba (photo, 30m) · Red Oak II ghost town (30m)

**Leg: Springfield MO → Tulsa (Day 3, Aug 7, ~190 mi)**
OK-KS-MO Tri-State Marker (photo, 10m) · Cars on the Route, Galena KS (brief) · Blue Whale of Catoosa (photo, 30m) · Cyrus Avery Centennial Plaza (30m) · Pops 66 (food, 45m) · Tower Theatre (exterior, 15m)

**Leg: Tulsa → Amarillo (Day 4, Aug 8, ~370 mi)**
**Paycom Center + Thunder Shop [nba]** (OKC, morning) · National Cowboy & Western Heritage Museum (OKC, 1h) · Oklahoma Route 66 Museum, Clinton (1h) · Big Texan Steak Ranch (food, 1h) · Cadillac Ranch (spray paint, 45m) · Midway Point of Route 66 (photo, 15m) · Palo Duro Canyon State Park (3h) · Leaning Tower of Texas (photo, 20m)

**Leg: Amarillo → Albuquerque (Day 5–6, Aug 9–10, ~290 mi)**
Route 66 Auto Museum (1h) · Petroglyph National Monument (1.5h) · Breaking Bad tour (1h)

**Leg: Albuquerque → Grand Canyon Village via Four Corners (Day 7, Aug 11, ~500 mi, ~9–10 h incl. stops — FULL DAY)**
Four Corners Monument (photo, 30m) · Monument Valley / Forrest Gump Point (scenic drive, 2h) · Horseshoe Bend (short hike, 1h)
*FIXED: the PDF's "~75 mi, ~1 hour" was wrong. This detour is ~500 mi and a full driving day. Use the corrected distance/time above and treat it as the longest, most demanding leg (early start, keep the tank above 1/4, stations are sparse here).*

**Leg: Grand Canyon → Springdale UT (Day 8, Aug 12, ~200 mi)**
Grand Canyon South Rim: Mather Point, Yavapai, Desert View (3–4h) · Glen Canyon Dam overlook (45m)

**Zion National Park (Day 9, Aug 13, park day)**
Emerald Pools Trail (3h) · Riverside Walk (1h) · Canyon Overlook Trail (1h) · Weeping Rock (30m) · scenic viewpoints
*NOTE: Zion shuttle is mandatory Apr–Oct. Arrive 7–8 AM.*

**Leg: Springdale → Las Vegas (Day 10, Aug 14, ~165 mi)**
Atlatl Rock · Elephant Rock · Seven Magic Mountains (30m) · Fountains of Bellagio (free show, 30m) · Caesars Palace (30m) · Flamingo Las Vegas (20m) · Las Vegas Strip evening walk (1–2h)

**Leg: Las Vegas → Three Rivers CA (Day 11, Aug 15, ~325 mi)**
Sphere Las Vegas (exterior) · drive to Three Rivers / Sequoia gateway

**Leg: Three Rivers/Sequoia → Los Angeles (Day 12, Aug 16, ~200 mi)**
Sequoia National Park · Santa Monica Pier "End of Route 66" sign (1h) · arrival celebration

**Los Angeles (city, Aug 16–19)**
Griffith Observatory (2h, sunset) · Griffith Park (1h) · Hollywood Sign viewpoints (1h) · Hollywood Walk of Fame (1h) · Sunset Blvd (30m) · Getty Center (2–3h) · Beverly Hills / Rodeo Drive (1h) · Malibu Pier (1h) · Venice Beach (1h) · Venice Canals (30m) · Marina del Rey (30m) · Academy Museum of Motion Pictures (2–3h) · **Crypto.com Arena + Lakers store + Star Plaza statues [nba]** · **Intuit Dome + Clippers store, Inglewood (near LAX) [nba]**

### 8.3 Fuel stops (from Fuel Report; ~$349.40 total, split 3 ways)

1. Sam's Club, Crestwood MO — $3.64/gal — $32.97
2. Sam's Club, Joplin MO — $2.98/gal (cheapest on route) — $23.52
3. Lucky Star Casino Travel Center, Calumet OK — $3.18/gal — $24.21
4. Valero, Vega TX — $3.29/gal — $23.94
5. Sinclair, Mexican Water AZ — $3.69/gal — $28.58
6. Speedy's, Cameron AZ — $3.83/gal — $28.97
7. Arizona area average — $5.03/gal — $7.94
8. Speedy's, Cameron AZ — $3.83/gal — $41.56
9. Costco, St George UT — $3.87/gal — $28.66
10. USA Gasoline, Barstow CA — $5.29/gal — $43.40 ⚠️ CA prices
11. Fastrip, Bakersfield CA — $5.17/gal — $46.58 ⚠️ CA prices
12. Los Angeles CA — $5.99/gal — $19.07 ⚠️ CA prices

Key warning to display: **fill the tank FULL before entering California**; cheapest fuel is Missouri; keep above 1/4 tank in the Four Corners area.

---

## 9. Chatbot (free assistant) — LOCKED design

Goal: user asks "we're driving X → Y, besides what's in the app, what else can we do?" and gets suggestions.

Two layers:

1. **Offline layer (reliable core, ALWAYS available).** At build time, pre-generate a short "extra ideas" text blurb for each leg and bundle it as static JSON (EN + ES). This works with zero signal and is the default answer shown instantly. Most of the real need is covered by this alone.
2. **Online layer (Groq, enhancement).** When there is signal, an open-model chatbot on **Groq's free API** (e.g. Llama 3.x or Qwen) answers open-ended follow-ups. If the request fails (no signal, rate-limited, any error), silently fall back to the offline blurb and tell the user "offline suggestions shown". The chatbot never blocks the app.

Do NOT use Gemini or in-browser WebLLM. The human chose Groq + static offline fallback.

---

## 9b. SECURITY (read carefully — the human is worried about API-key leaks)

Plain explanation for the human, then the rules.

**Why there is no financial risk:** every service here is on a free tier with NO credit card attached. Groq's free API, Cloudflare Workers' free tier, and GitHub Pages all work without billing. So even in the absolute worst case (someone finds and abuses the endpoint), the only thing that can happen is rate-limiting or the key getting throttled/revoked. There is no bill to run up. This is deliberate.

**Why the key still must be hidden:** the React app is fully public (anyone can read all its code in the browser). If the Groq key were in that code, anyone could copy it and use up the free quota. So the key must never touch the client.

**The architecture (mandatory):**

```
Phone (React app, public)  ──HTTPS──►  Cloudflare Worker (holds the key)  ──►  Groq API
```

- The app calls only the Worker's URL. The Worker holds the Groq key and calls Groq. The app never sees the key.
- The Worker URL is not a secret (it's fine if people see it). The Groq key inside it IS a secret.

**Rules for Claude Code (all mandatory):**

1. The Groq key is stored ONLY via `npx wrangler secret put GROQ_API_KEY`. It is never in any source file, never in `wrangler.toml`, never printed in logs, never returned in a response.
2. Add to `.gitignore`: `.env`, `.env.*`, `.dev.vars`, `.wrangler/`, `dist/`, `node_modules/`. Verify no secret is tracked before any commit.
3. The Worker restricts CORS to the app's exact GitHub Pages origin only (e.g. `https://<user>.github.io`). Reject other origins.
4. The Worker rate-limits requests (Cloudflare's rate-limit binding, or a simple per-IP counter) so a stray script can't drain the free quota.
5. The Worker validates/whitelists the request shape (only the chat-prompt endpoint, only expected fields) and never proxies arbitrary calls.
6. The client sends NO personal data to the Worker beyond the trip-context text needed for the answer. No location coordinates, no expense data, no names.
7. Provide a `.dev.vars.example` (placeholder only) and a README section explaining, step by step, how the human creates a free Groq key and runs `wrangler secret put` themselves. Claude Code must NOT ask for or handle the real key; the human sets it.

If any of these can't be met, stop and flag it rather than shipping something insecure.

---

## 10. Deployment

- Vite build, deploy `dist/` to **GitHub Pages** (Actions workflow or `gh-pages` branch).
- Set Vite `base: '/<repo-name>/'`.
- Verify the service worker + manifest so the app is installable and offline-tested (Lighthouse PWA check).
- If the chatbot online layer is enabled, deploy the Cloudflare Worker separately and store its URL in a client env var (the Worker URL is not secret; the key inside it is).

---

## 11. Coding conventions & learning notes

The human is a Java developer, ~3 months into JavaScript/TypeScript, learning on the job (Angular, INPS "Worklist"). They want to **understand**, not copy.

When generating or explaining code:
- Add brief comments on anything not obvious to someone new to JS/TS.
- When you use a JS/TS concept that has no direct Java equivalent (hooks, closures, async/await, destructuring, optional chaining, union types), add a one-line explanation and, where it helps, a "in Java this would be like..." analogy.
- Prefer readable, explicit code over clever one-liners.
- TypeScript types are your friend here: lean on them, they map closely to Java's type system.
- Keep components small and single-purpose.
- Commit in small, described steps so the human can follow the build.

---

## 12. Data reconciliation log (all resolved)

1. **Day 7 distance — FIXED.** Albuquerque → Four Corners → Monument Valley → Horseshoe Bend → Grand Canyon is ~500 mi / full day, not "~75 mi, ~1 h". Corrected in section 8.2.
2. **Night count — RESOLVED = 16 nights** (human confirmed). Ignore the PDF's "18 nights".
3. **OKC vs Tulsa POIs — FIXED.** OK Route 66 Museum (Clinton), National Cowboy Museum + Paycom Center (OKC) moved to the Tulsa → Amarillo leg (Day 4).
4. **Antelope Canyon — default REMOVED** (the itinerary marks it removed; the leftover $90 budget line is stale). If the human later says otherwise, add it back as a Day 7/8 POI requiring advance booking.
5. **Day 8 header — RESOLVED.** Use "Grand Canyon → Springdale" (ignore the "Tuba City" label).

---

## 13. Build order (milestones)

1. Scaffold **React + Vite + TypeScript** as a PWA (vite-plugin-pwa, Tailwind). Set up i18n (EN + ES) skeleton and language toggle first, plus the fixed travelers list config and the per-device "who am I" picker, so every feature is built bilingual from the start.
2. Encode section 8 into `tripData.ts` + the localStorage override layer.
3. Home ("where are we") + City view + Leg view with Google Maps links (fully offline).
4. Itinerary editor (add/edit/remove/reorder + reset).
5. Hotels + Fuel screens.
6. Offline chatbot layer (bundled per-leg "extra ideas", EN + ES).
7. Expense splitter (single writer, payer from travelers list) + "Open shared album" link. Camp Snap shot log only if there is time (optional).
8. Online chatbot layer: Cloudflare Worker + Groq, with the security rules in section 9b, falling back to the offline layer on any failure.
9. Polish, Lighthouse PWA pass, deploy to GitHub Pages. Write the README (incl. the human's step-by-step for creating the Groq key and running `wrangler secret put`).

---

## 14. Decisions locked (no open questions — safe to scaffold)

1. **Framework:** React + Vite + TypeScript. (Angular rejected; convenience over job practice.)
2. **Chatbot:** Groq free API (open model) via Cloudflare Worker, with the static offline "extra ideas" fallback. No Gemini, no WebLLM.
3. **Languages:** English + Spanish, with a toggle. Place names stay English.
4. **Data fixes applied:** Day 7 = ~500 mi full day; 16 nights; OKC POIs + Thunder moved to the Tulsa → Amarillo leg; Antelope Canyon out; Day 8 = Grand Canyon → Springdale.
5. **Extra features confirmed:** fixed travelers list, expense splitter (proportional shares, **single writer = Falco**, no merge/sync), shared photo/video album via link.
6. **No login / no auth / no accounts / no admin (Option A).** Nothing central exists to administer or to break into. A per-device "who am I" picker is kept (local only, cosmetic for now, future-proofing). Alessio ("Falco") keeps the expenses on his device.
7. **Photos & videos:** shared **Google Photos** album, **invite-only**. Not hosted in the app; the app only links to it.
8. **Camp Snap CS-Pro shot log:** optional, low priority, single-user, no roll/frame model.
9. **Sync:** ~~none for app data~~ **AMENDED (July 2026, by the human's request):** shared EXPENSES sync across the three phones via the existing Cloudflare Worker + free KV namespace, gated by a `TRIP_PIN` Worker secret. **Multi-writer:** all three phones can add and delete; the Worker MERGES every push (union by expense id + deletion tombstones in `deletedIds`), so concurrent pushes never overwrite each other and deletions propagate everywhere. Phones pull+merge on opening Expenses and keep the last copy offline. The ITINERARY overrides (added/edited/removed stops, custom order, photos as data-URLs) sync the same way via `/itinerary` (merge per poi-id; "reset to default" wins wholesale via `resetAt`). The shopping list and the "seen it" POI checkmarks sync via `/state` (items merge by id + tombstones; checkmarks/order use per-entry timestamps so un-checking propagates). Rule of thumb: EVERYTHING is shared read+write among the three travelers, except personal expenses and device settings (theme, language, PIN), which stay local. Media sync still handled by the shared album, outside the app.
10. **Cost & security:** everything on free tiers with no billing attached; the Groq key lives only in the Cloudflare Worker secret (section 9b).
