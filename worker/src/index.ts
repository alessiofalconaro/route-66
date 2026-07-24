// Cloudflare Worker: the ONLY place that knows the Groq API key.
// The public React app calls this Worker; the Worker calls Groq.
// Security rules implemented here (CLAUDE.md 9b):
//   1. key only via `wrangler secret put GROQ_API_KEY` (env.GROQ_API_KEY)
//   3. CORS locked to the exact GitHub Pages origin
//   4. per-IP rate limit (best-effort in-memory counter, free tier)
//   5. strict request-shape validation, single endpoint, no arbitrary proxying
// The key is never logged and never included in any response.

// Minimal KV typing (we don't pull in @cloudflare/workers-types for one use).
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  GROQ_API_KEY: string; // secret (wrangler secret put)
  TRIP_PIN?: string; // secret (wrangler secret put) — gates the expense sync
  ALLOWED_ORIGIN: string; // plain var in wrangler.toml
  EXPENSES: KVNamespace; // free KV storage for the shared-expenses snapshot
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- best-effort per-IP rate limit -----------------------------------------
// Note for the human: Workers can spin up many isolated instances, so this
// Map is not a perfect global counter — but it's free and good enough to stop
// a stray script from draining the Groq free quota. Worst case: throttling.
const WINDOW_MS = 60_000;
// Generous: the three phones often share one public IP (hotel Wi-Fi /
// hotspot) and each app-open fires a couple of sync pulls.
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

// --- request validation -----------------------------------------------------
function validBody(body: unknown): body is { messages: ChatMessage[]; segmentLabel: string; lang: string } {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.segmentLabel !== 'string' || b.segmentLabel.length > 120) return false;
  if (b.lang !== 'en' && b.lang !== 'es') return false;
  if (!Array.isArray(b.messages) || b.messages.length === 0 || b.messages.length > 12) return false;
  return b.messages.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
      typeof (m as ChatMessage).content === 'string' &&
      (m as ChatMessage).content.length > 0 &&
      (m as ChatMessage).content.length <= 2000,
  );
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Trip-Pin',
  };
}

// --- shared-expenses sync (GET/PUT /expenses, gated by the trip PIN) --------
// Multi-writer: all three phones may add and delete. PUT does a server-side
// MERGE (union by expense id + deletion tombstones), so concurrent pushes
// never overwrite each other and a deletion propagates to every phone.
interface ExpenseRow {
  id: string;
  payerId: string;
  amountUsd: number;
  category: string;
  note: string;
  date: string;
}

interface Snapshot {
  expenses: ExpenseRow[];
  deletedIds: string[];
  updatedAt: number;
}

function validSnapshot(body: unknown): body is Snapshot {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.updatedAt !== 'number') return false;
  if (!Array.isArray(b.deletedIds) || b.deletedIds.length > 4000) return false;
  if (!b.deletedIds.every((d) => typeof d === 'string' && d.length <= 64)) return false;
  if (!Array.isArray(b.expenses) || b.expenses.length > 2000) return false;
  return b.expenses.every((e) => {
    if (typeof e !== 'object' || e === null) return false;
    const x = e as Record<string, unknown>;
    return (
      typeof x.id === 'string' && x.id.length <= 64 &&
      typeof x.payerId === 'string' && x.payerId.length <= 32 &&
      typeof x.amountUsd === 'number' && x.amountUsd > 0 && x.amountUsd < 1000000 &&
      // default ids or user-created labels — any short string is fine
      typeof x.category === 'string' && x.category.length >= 1 && x.category.length <= 40 &&
      typeof x.note === 'string' && x.note.length <= 300 &&
      typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date)
    );
  });
}

// --- itinerary sync (GET/PUT /itinerary) ------------------------------------
// The user-edited itinerary (added/edited/removed stops, custom order, photos
// as data-URLs) shared across the three phones. Merge on PUT; a client that
// performed "reset to default" sends a newer resetAt and wins wholesale.
interface ItinerarySnapshot {
  overrides: {
    removedPoiIds: string[];
    editedPois: Record<string, unknown>;
    addedPois: Record<string, unknown[]>;
    poiOrder: Record<string, string[]>;
  };
  updatedAt: number;
  resetAt: number;
}

function validItinerary(body: unknown): body is ItinerarySnapshot {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.updatedAt !== 'number' || typeof b.resetAt !== 'number') return false;
  const o = b.overrides as Record<string, unknown> | undefined;
  return (
    typeof o === 'object' && o !== null &&
    Array.isArray(o.removedPoiIds) &&
    typeof o.editedPois === 'object' && o.editedPois !== null &&
    typeof o.addedPois === 'object' && o.addedPois !== null &&
    typeof o.poiOrder === 'object' && o.poiOrder !== null
  );
}

const EMPTY_ITINERARY: ItinerarySnapshot = {
  overrides: { removedPoiIds: [], editedPois: {}, addedPois: {}, poiOrder: {} },
  updatedAt: 0,
  resetAt: 0,
};

function mergeItinerary(stored: ItinerarySnapshot, incoming: ItinerarySnapshot): ItinerarySnapshot {
  // A fresher "reset to default" wipes the slate on purpose.
  if (incoming.resetAt > stored.resetAt) return { ...incoming, updatedAt: Date.now() };
  // Merge added POIs per segment by poi id (incoming wins per id).
  const addedPois: Record<string, unknown[]> = { ...stored.overrides.addedPois };
  for (const [segId, pois] of Object.entries(incoming.overrides.addedPois)) {
    const byId = new Map((addedPois[segId] ?? []).map((p) => [(p as { id: string }).id, p]));
    for (const p of pois) byId.set((p as { id: string }).id, p);
    addedPois[segId] = [...byId.values()];
  }
  return {
    overrides: {
      removedPoiIds: [...new Set([...stored.overrides.removedPoiIds, ...incoming.overrides.removedPoiIds])],
      editedPois: { ...stored.overrides.editedPois, ...incoming.overrides.editedPois },
      addedPois,
      poiOrder: { ...stored.overrides.poiOrder, ...incoming.overrides.poiOrder },
    },
    updatedAt: Date.now(),
    resetAt: Math.max(stored.resetAt, incoming.resetAt),
  };
}

async function handleItinerary(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (!env.TRIP_PIN) return json(503, { error: 'sync_not_configured' });
  if (request.headers.get('X-Trip-Pin') !== env.TRIP_PIN) return json(401, { error: 'bad_pin' });

  if (request.method === 'GET') {
    const raw = await env.EXPENSES.get('itinerary');
    return json(200, raw ? (JSON.parse(raw) as ItinerarySnapshot) : EMPTY_ITINERARY);
  }

  if (request.method === 'PUT') {
    const text = await request.text();
    if (text.length > 8 * 1024 * 1024) return json(413, { error: 'too_large' });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'bad_json' });
    }
    if (!validItinerary(body)) return json(400, { error: 'bad_request' });
    const raw = await env.EXPENSES.get('itinerary');
    const stored = raw ? (JSON.parse(raw) as ItinerarySnapshot) : EMPTY_ITINERARY;
    const merged = mergeItinerary(stored, body);
    await env.EXPENSES.put('itinerary', JSON.stringify(merged));
    return json(200, merged);
  }

  return json(405, { error: 'method_not_allowed' });
}

// --- Chicago-plan sync (GET/PUT /plan) --------------------------------------
// The user-edited Chicago day-by-day plan (added/edited/removed/reordered
// steps), shared across the three phones. Same merge shape as /itinerary.
interface PlanSnapshot {
  overrides: {
    removedStepIds: string[];
    editedSteps: Record<string, unknown>;
    addedSteps: Record<string, unknown[]>;
    stepOrder: Record<string, string[]>;
  };
  updatedAt: number;
  resetAt: number;
}

function validPlan(body: unknown): body is PlanSnapshot {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.updatedAt !== 'number' || typeof b.resetAt !== 'number') return false;
  const o = b.overrides as Record<string, unknown> | undefined;
  return (
    typeof o === 'object' && o !== null &&
    Array.isArray(o.removedStepIds) &&
    typeof o.editedSteps === 'object' && o.editedSteps !== null &&
    typeof o.addedSteps === 'object' && o.addedSteps !== null &&
    typeof o.stepOrder === 'object' && o.stepOrder !== null
  );
}

const EMPTY_PLAN: PlanSnapshot = {
  overrides: { removedStepIds: [], editedSteps: {}, addedSteps: {}, stepOrder: {} },
  updatedAt: 0,
  resetAt: 0,
};

function mergePlan(stored: PlanSnapshot, incoming: PlanSnapshot): PlanSnapshot {
  // A fresher "reset to default" wipes the slate on purpose.
  if (incoming.resetAt > stored.resetAt) return { ...incoming, updatedAt: Date.now() };
  // Merge added steps per day by step id (incoming wins per id).
  const addedSteps: Record<string, unknown[]> = { ...stored.overrides.addedSteps };
  for (const [dayId, steps] of Object.entries(incoming.overrides.addedSteps)) {
    const byId = new Map((addedSteps[dayId] ?? []).map((s) => [(s as { id: string }).id, s]));
    for (const s of steps) byId.set((s as { id: string }).id, s);
    addedSteps[dayId] = [...byId.values()];
  }
  return {
    overrides: {
      removedStepIds: [...new Set([...stored.overrides.removedStepIds, ...incoming.overrides.removedStepIds])],
      editedSteps: { ...stored.overrides.editedSteps, ...incoming.overrides.editedSteps },
      addedSteps,
      stepOrder: { ...stored.overrides.stepOrder, ...incoming.overrides.stepOrder },
    },
    updatedAt: Date.now(),
    resetAt: Math.max(stored.resetAt, incoming.resetAt),
  };
}

async function handlePlan(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (!env.TRIP_PIN) return json(503, { error: 'sync_not_configured' });
  if (request.headers.get('X-Trip-Pin') !== env.TRIP_PIN) return json(401, { error: 'bad_pin' });

  if (request.method === 'GET') {
    const raw = await env.EXPENSES.get('chicago-plan');
    return json(200, raw ? (JSON.parse(raw) as PlanSnapshot) : EMPTY_PLAN);
  }

  if (request.method === 'PUT') {
    const text = await request.text();
    if (text.length > 1024 * 1024) return json(413, { error: 'too_large' });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'bad_json' });
    }
    if (!validPlan(body)) return json(400, { error: 'bad_request' });
    const raw = await env.EXPENSES.get('chicago-plan');
    const stored = raw ? (JSON.parse(raw) as PlanSnapshot) : EMPTY_PLAN;
    const merged = mergePlan(stored, body);
    await env.EXPENSES.put('chicago-plan', JSON.stringify(merged));
    return json(200, merged);
  }

  return json(405, { error: 'method_not_allowed' });
}

// --- shared state sync (GET/PUT /state) -------------------------------------
// Shopping list + "seen it" checkmarks, shared by all three phones.
// Items merge by id with tombstones; checkmarks and the list order use
// per-entry timestamps so an UNcheck propagates too (union alone couldn't).
interface Mark {
  v: boolean;
  t: number;
}

interface SharedState {
  shopItems: { id: string }[];
  shopDeleted: string[];
  shopOrder: string[];
  shopOrderT: number;
  shopDone: Record<string, Mark>;
  visited: Record<string, Mark>;
  updatedAt: number;
}

const EMPTY_STATE: SharedState = {
  shopItems: [],
  shopDeleted: [],
  shopOrder: [],
  shopOrderT: 0,
  shopDone: {},
  visited: {},
  updatedAt: 0,
};

function validState(body: unknown): body is SharedState {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.shopItems) && b.shopItems.length <= 500 &&
    Array.isArray(b.shopDeleted) && b.shopDeleted.length <= 2000 &&
    Array.isArray(b.shopOrder) &&
    typeof b.shopOrderT === 'number' &&
    typeof b.shopDone === 'object' && b.shopDone !== null &&
    typeof b.visited === 'object' && b.visited !== null &&
    typeof b.updatedAt === 'number'
  );
}

function mergeMarks(a: Record<string, Mark>, b: Record<string, Mark>): Record<string, Mark> {
  const out = { ...a };
  for (const [k, m] of Object.entries(b)) {
    if (!out[k] || m.t > out[k].t) out[k] = m; // newest toggle wins per entry
  }
  return out;
}

function mergeState(stored: SharedState, incoming: SharedState): SharedState {
  const deleted = new Set([...stored.shopDeleted, ...incoming.shopDeleted]);
  const byId = new Map(stored.shopItems.map((i) => [i.id, i]));
  for (const i of incoming.shopItems) byId.set(i.id, i);
  const newerOrder = incoming.shopOrderT >= stored.shopOrderT ? incoming : stored;
  return {
    shopItems: [...byId.values()].filter((i) => !deleted.has(i.id)),
    shopDeleted: [...deleted].slice(-2000),
    shopOrder: newerOrder.shopOrder,
    shopOrderT: newerOrder.shopOrderT,
    shopDone: mergeMarks(stored.shopDone, incoming.shopDone),
    visited: mergeMarks(stored.visited, incoming.visited),
    updatedAt: Date.now(),
  };
}

async function handleState(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (!env.TRIP_PIN) return json(503, { error: 'sync_not_configured' });
  if (request.headers.get('X-Trip-Pin') !== env.TRIP_PIN) return json(401, { error: 'bad_pin' });

  if (request.method === 'GET') {
    const raw = await env.EXPENSES.get('shared-state');
    return json(200, raw ? (JSON.parse(raw) as SharedState) : EMPTY_STATE);
  }

  if (request.method === 'PUT') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'bad_json' });
    }
    if (!validState(body)) return json(400, { error: 'bad_request' });
    const raw = await env.EXPENSES.get('shared-state');
    const stored = raw ? (JSON.parse(raw) as SharedState) : EMPTY_STATE;
    const merged = mergeState(stored, body);
    await env.EXPENSES.put('shared-state', JSON.stringify(merged));
    return json(200, merged);
  }

  return json(405, { error: 'method_not_allowed' });
}

/** Reads the stored snapshot, tolerating the older shape without deletedIds. */
async function readSnapshot(env: Env): Promise<Snapshot> {
  const raw = await env.EXPENSES.get('shared-expenses');
  if (!raw) return { expenses: [], deletedIds: [], updatedAt: 0 };
  const parsed = JSON.parse(raw) as Partial<Snapshot>;
  return {
    expenses: parsed.expenses ?? [],
    deletedIds: parsed.deletedIds ?? [],
    updatedAt: parsed.updatedAt ?? 0,
  };
}

async function handleExpenses(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (!env.TRIP_PIN) return json(503, { error: 'sync_not_configured' });
  // PIN check — never echoed back, never logged.
  if (request.headers.get('X-Trip-Pin') !== env.TRIP_PIN) {
    return json(401, { error: 'bad_pin' });
  }

  if (request.method === 'GET') {
    return json(200, await readSnapshot(env));
  }

  if (request.method === 'PUT') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'bad_json' });
    }
    if (!validSnapshot(body)) return json(400, { error: 'bad_request' });

    // MERGE with what's stored instead of overwriting it.
    const stored = await readSnapshot(env);
    const deleted = new Set([...stored.deletedIds, ...body.deletedIds]);
    const byId = new Map(stored.expenses.map((e) => [e.id, e]));
    for (const e of body.expenses) byId.set(e.id, e); // incoming wins per id
    const merged: Snapshot = {
      expenses: [...byId.values()].filter((e) => !deleted.has(e.id)),
      deletedIds: [...deleted].slice(-4000), // keep the tombstone list bounded
      updatedAt: Date.now(),
    };
    await env.EXPENSES.put('shared-expenses', JSON.stringify(merged));
    // Return the merged result so the client adopts it immediately.
    return json(200, merged);
  }

  return json(405, { error: 'method_not_allowed' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    // Rule 3: only our GitHub Pages origin may call this Worker.
    if (origin !== env.ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }
    const cors = corsHeaders(env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Rule 4: rate limit per IP (both endpoints).
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Sync endpoints; everything else is the chat proxy.
    const pathname = new URL(request.url).pathname;
    if (pathname === '/expenses') return handleExpenses(request, env, cors);
    if (pathname === '/itinerary') return handleItinerary(request, env, cors);
    if (pathname === '/plan') return handlePlan(request, env, cors);
    if (pathname === '/state') return handleState(request, env, cors);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Rule 5: strict shape validation.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'bad_json' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!validBody(body)) {
      return new Response(JSON.stringify({ error: 'bad_request' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const langName = body.lang === 'es' ? 'Spanish' : 'English';
    const system =
      `You are a concise, practical road-trip assistant for a Route 66 trip ` +
      `(Chicago to Los Angeles, August 2026, three friends in a rental car). ` +
      `The travelers are currently on this part of the trip: "${body.segmentLabel}". ` +
      `Suggest sights, food and quick stops near that area. Keep answers short ` +
      `(under 200 words), no markdown tables. Answer in ${langName}. ` +
      `ACCURACY RULES: answer factual questions (movies, TV shows, filming ` +
      `locations, history, sports) directly and confidently from your ` +
      `knowledge — that is your job; never tell the user to "search online" ` +
      `or "check when you arrive" as a substitute for an answer you know. ` +
      `At the same time, never INVENT specifics: if a place/location does not ` +
      `exist or is in a different city than the user assumes, say so plainly ` +
      `and give the correct fact (e.g. a show set in one city but filmed in ` +
      `another). Only for volatile details (opening hours, prices, temporary ` +
      `closures) add a short note that they can change.`;

    // Call Groq (OpenAI-compatible API). The key exists ONLY here.
    // Try the strongest free model first, fall back if it's unavailable.
    const MODELS = ['moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile'];
    let groqRes: Response | null = null;
    for (const model of MODELS) {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...body.messages],
          max_tokens: 500,
          temperature: 0.4, // lower = fewer creative "inventions"
        }),
      });
      if (groqRes.ok) break;
    }

    if (!groqRes || !groqRes.ok) {
      // Do NOT leak Groq's error body (could reference the request/key setup).
      return new Response(JSON.stringify({ error: 'upstream_error' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
