// Cloudflare Worker: the ONLY place that knows the Groq API key.
// The public React app calls this Worker; the Worker calls Groq.
// Security rules implemented here (CLAUDE.md 9b):
//   1. key only via `wrangler secret put GROQ_API_KEY` (env.GROQ_API_KEY)
//   3. CORS locked to the exact GitHub Pages origin
//   4. per-IP rate limit (best-effort in-memory counter, free tier)
//   5. strict request-shape validation, single endpoint, no arbitrary proxying
// The key is never logged and never included in any response.

export interface Env {
  GROQ_API_KEY: string; // secret (wrangler secret put)
  ALLOWED_ORIGIN: string; // plain var in wrangler.toml
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Rule 4: rate limit per IP.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
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
      `(under 200 words), no markdown tables. Answer in ${langName}.`;

    // Call Groq (OpenAI-compatible API). The key exists ONLY here.
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, ...body.messages],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
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
