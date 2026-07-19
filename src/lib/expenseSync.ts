// Shared-expenses sync through the same Cloudflare Worker as the chat.
// Multi-writer: ALL three phones can add and delete; the server MERGES every
// push (union by expense id + deletion tombstones), so nobody overwrites
// anybody and deletions propagate everywhere. Offline → you keep the last
// copy you downloaded. The trip PIN gates everything server-side.
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
  deletedIds: string[]; // tombstones: ids deleted on some phone
  updatedAt: number; // ms epoch of the last change
}

/** Client-side union of two snapshots (same rule the server applies). */
export function mergeSnapshots(a: SharedSnapshot, b: SharedSnapshot): SharedSnapshot {
  const deleted = new Set([...a.deletedIds, ...b.deletedIds]);
  const byId = new Map(a.expenses.map((e) => [e.id, e]));
  for (const e of b.expenses) byId.set(e.id, e);
  return {
    expenses: [...byId.values()].filter((e) => !deleted.has(e.id)),
    deletedIds: [...deleted],
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
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

/** Uploads the snapshot; the server merges and returns the combined result,
 *  which the caller should adopt as its new local state. Throws on failure. */
export async function pushShared(snapshot: SharedSnapshot, pin: string): Promise<SharedSnapshot> {
  const res = await request(pin, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`push ${res.status}`);
  return (await res.json()) as SharedSnapshot;
}
