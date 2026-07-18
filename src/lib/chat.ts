// Online chatbot layer (CLAUDE.md section 9, layer 2).
// Talks ONLY to our Cloudflare Worker — never to Groq directly, so no API key
// ever exists in this (fully public) client code. The Worker URL is not a
// secret. If the endpoint is unset, offline, or errors: the caller falls back
// to the bundled offline "extra ideas" and the app keeps working.

import type { Lang } from '../i18n';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Set at build time via the VITE_CHAT_ENDPOINT env variable (see README).
// import.meta.env = Vite's build-time constants (like a compile-time property).
const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

export function chatConfigured(): boolean {
  return typeof ENDPOINT === 'string' && ENDPOINT.startsWith('https://');
}

/**
 * Sends the conversation to the Worker and returns the assistant's reply.
 * Throws on ANY failure — the caller catches and shows the offline blurb.
 * `segmentLabel` gives the model trip context; we send NO personal data,
 * no coordinates, no expenses, no names (security rule 9b.6).
 */
export async function askAssistant(
  messages: ChatMessage[],
  segmentLabel: string,
  lang: Lang,
): Promise<string> {
  if (!chatConfigured()) throw new Error('chat endpoint not configured');

  // AbortController = cancel the request if it takes too long (bad signal).
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const res = await fetch(ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, segmentLabel, lang }),
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(`worker responded ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (typeof data.reply !== 'string' || data.reply.length === 0) {
      throw new Error('empty reply');
    }
    return data.reply;
  } finally {
    clearTimeout(timer);
  }
}
