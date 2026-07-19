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
const MAX_PER_WINDOW = 10;
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

    // Expense sync lives on /expenses; everything else is the chat proxy.
    if (new URL(request.url).pathname === '/expenses') {
      return handleExpenses(request, env, cors);
    }

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
      `ACCURACY RULES: never invent attractions, addresses, filming locations, ` +
      `opening hours or prices. If you are not certain something exists or is ` +
      `really located where the user asks, say you are not sure instead of ` +
      `guessing, and recommend verifying on the spot. Movie/TV filming ` +
      `locations are a common trap: only mention ones you are confident about, ` +
      `including the real city they are in.`;

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
