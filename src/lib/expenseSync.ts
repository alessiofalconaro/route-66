// Shared-expenses sync through the same Cloudflare Worker as the chat.
// Model: Falco's phone is the only WRITER (it pushes after every change);
// all phones PULL on opening the Expenses screen. Offline → you simply keep
// the last copy you downloaded. The trip PIN gates everything server-side.
import type { Expense } from '../types';

const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

function syncUrl(): string | null {
  if (!ENDPOINT || !ENDPOINT.startsWith('https://')) return null;
  return new URL('/expenses', ENDPOINT).toString();
}

export function syncConfigured(pin: string): boolean {
  return pin.trim().length > 0 && syncUrl() !== null;
}

export interface SharedSnapshot {
  expenses: Expense[];
  updatedAt: number; // ms epoch of the writer's last change
}

async function request(pin: string, init: RequestInit): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10000);
  try {
    return await fetch(syncUrl()!, {
      ...init,
      headers: { ...init.headers, 'X-Trip-Pin': pin.trim() },
      signal: abort.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Downloads the shared snapshot. Throws on any failure (caller shows status). */
export async function pullShared(pin: string): Promise<SharedSnapshot> {
  const res = await request(pin, { method: 'GET' });
  if (!res.ok) throw new Error(`pull ${res.status}`);
  return (await res.json()) as SharedSnapshot;
}

/** Uploads the snapshot (writer phone only). Throws on failure. */
export async function pushShared(snapshot: SharedSnapshot, pin: string): Promise<void> {
  const res = await request(pin, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`push ${res.status}`);
}
