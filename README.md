# Route 66 Trip Companion 🛣️

Offline-first PWA for the Chicago → Los Angeles Route 66 trip (Aug 5–19, 2026).
Three friends, one rental car, zero running costs.

**Stack:** React + Vite + TypeScript · Tailwind CSS · vite-plugin-pwa · GitHub Pages ·
(optional) Cloudflare Worker + Groq free API for the online assistant.

## What it does

- **Home / "Where are we?"** — pick an overnight city or a driving leg (or tap
  "Use my location"); see the POIs for that part of the trip, each with a
  one-tap **Open in Google Maps** button (plain URL links, no Maps API, no key).
- **Itinerary editor** — tap **Edit** in any city/leg view to add, edit, remove
  and reorder stops. Edits are saved on-device (localStorage) and can be
  exported/imported as a JSON file to share between the three phones.
- **Hotels** — all 16 nights with parking costs and resort fees.
- **Fuel plan** — all 12 planned stops (~$349 total), with the key warnings
  (fill FULL before California, cheapest gas in Missouri, never below 1/4 tank
  around Four Corners).
- **Assistant** — instant offline "extra ideas" for every leg (bundled EN+ES);
  online free-text follow-ups via Groq when there is signal. Any failure falls
  back to the offline ideas — the assistant never blocks the app.
- **Expenses** — shared splitter: all three travelers add/delete from their
  own phones (server-side merge, trip-PIN gated). Proportional shares: the
  payer's own 1/3 offsets what they're owed. Plus a per-device personal
  ledger that auto-includes your 1/3 of every shared expense.
- **More** — shared Google Photos album link, pre-departure checklist,
  emergency numbers (works offline), desert-heat warning, EN/ES toggle.

Everything except the online assistant and the album link works in
**airplane mode** once the app has been opened once (service-worker cache).

## Local development

```bash
npm install
npm run dev        # http://localhost:5173/route-66/
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

## Deploy (GitHub Pages, free)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically.
3. The app lives at `https://alessiofalconaro.github.io/route-66/`.
   On the phone: open it in the browser → "Add to Home Screen" → it installs
   like a native app and works offline.

## Online assistant setup (optional, free, no credit card)

The chatbot's online layer needs a Groq API key. **The key never goes in this
repo or in the app** — it lives only inside a Cloudflare Worker. The app is
fully public code; anything in it can be read by anyone, which is why the key
must stay server-side. Worst case if someone abuses the endpoint: free-quota
rate limiting. There is no bill anywhere.

### Step 1 — create a free Groq key (you do this, not the code)

1. Go to <https://console.groq.com> and sign up (free, no card).
2. **API Keys → Create API Key**. Copy the key (`gsk_...`) somewhere safe.
   You'll paste it only into the terminal in step 3.

### Step 2 — create the free Cloudflare account

1. Sign up at <https://dash.cloudflare.com/sign-up> (free plan, no card).

### Step 3 — deploy the Worker and set the secret

```bash
cd worker
npx wrangler login                      # opens the browser to authorize
npx wrangler deploy                     # deploys route66-chat, prints its URL
npx wrangler secret put GROQ_API_KEY    # paste the gsk_... key when prompted
```

The secret is stored encrypted by Cloudflare. It is never in a file, never in
git, never visible in the app. `.dev.vars` (for local Worker testing only) is
gitignored; use `.dev.vars.example` as a template.

### Step 4 — point the app at the Worker

The Worker URL printed by `wrangler deploy` (e.g.
`https://route66-chat.<your-subdomain>.workers.dev`) is **not** a secret.
Set it as a GitHub Actions **variable** (not secret): repo **Settings →
Secrets and variables → Actions → Variables → New repository variable**:

- Name: `VITE_CHAT_ENDPOINT`
- Value: the Worker URL

Push again (or re-run the workflow) and the online assistant is live. If you
skip all of this, the app still works — the assistant just answers with the
bundled offline ideas only.

### Security model (short version)

- CORS on the Worker only accepts requests from
  `https://alessiofalconaro.github.io` (see `worker/wrangler.toml`).
- Per-IP rate limiting (best effort) protects the free quota.
- The Worker validates the request shape and proxies exactly one endpoint.
- The client sends only the chat text + the segment label — no location
  coordinates, no expenses, no names.

## Photos for POI cards (optional)

POI cards show a category icon by default. To show a real photo, drop an image
into `public/img/` and set the POI's `photo` field in
`src/data/tripData.ts` (e.g. `photo: '/route-66/img/cadillac-ranch.jpg'`), or
use a Wikimedia Commons URL (CC-licensed — keep the attribution in a comment).
Wikimedia images are cached for offline use after the first view.

## Project layout

```
src/
  data/tripData.ts     ← the whole trip (segments, POIs, hotels, fuel) — read-only
  data/extraIdeas.ts   ← offline assistant blurbs per leg (EN+ES)
  i18n.tsx             ← EN/ES dictionary + language context
  lib/                 ← storage, overrides merge, expenses math, geo, maps, chat
  components/          ← PoiCard, HotelCard, SegmentView (incl. editor), ...
  views/               ← one file per screen (Home, Hotels, Fuel, Chat, More...)
worker/                ← Cloudflare Worker proxy for Groq (the ONLY key holder)
```

User edits never touch `tripData.ts`: they are stored as an override object in
localStorage and merged at runtime, so "Reset itinerary" always works.
