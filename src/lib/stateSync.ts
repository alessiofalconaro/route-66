// Shared state sync: shopping list + "seen it" checkmarks, shared by the
// three phones through the Worker (/state), same PIN as the other syncs.
// Checkmarks use per-entry timestamps so UNchecking propagates too.
import { loadJson, saveJson, usePersistentState } from './storage';

const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

export interface Mark {
  v: boolean; // checked?
  t: number; // when it was last toggled (newest wins on merge)
}

export interface ShopItem {
  id: string;
  key?: string; // default item → i18n key (follows the EN/ES toggle)
  label?: string; // custom item → fixed text
}

export interface SharedState {
  shopItems: ShopItem[];
  shopDeleted: string[]; // tombstones
  shopOrder: string[]; // item ids in display order
  shopOrderT: number; // when the order was last changed
  shopDone: Record<string, Mark>;
  visited: Record<string, Mark>; // poi id → seen?
  updatedAt: number;
}

const DEFAULT_SHOP_KEYS = [
  'shop1', 'shop2', 'shop3', 'shop4', 'shop5',
  'shop6', 'shop7', 'shop8', 'shop9', 'shop10',
];

/** First run: build the state from the pre-sync localStorage keys. */
function migrateLegacy(): SharedState {
  const legacyItems = loadJson<ShopItem[]>(
    'shoppingItems',
    DEFAULT_SHOP_KEYS.map((k) => ({ id: k, key: k })),
  );
  const now = Date.now();
  const marks = (ids: string[]): Record<string, Mark> =>
    Object.fromEntries(ids.map((id) => [id, { v: true, t: now }]));
  return {
    shopItems: legacyItems,
    shopDeleted: [],
    shopOrder: legacyItems.map((i) => i.id),
    shopOrderT: 0,
    shopDone: marks(loadJson<string[]>('shopping', [])),
    visited: marks(loadJson<string[]>('visitedPois', [])),
    updatedAt: 0,
  };
}

export function loadState(): SharedState {
  return loadJson<SharedState>('sharedState', migrateLegacy());
}

function mergeMarks(a: Record<string, Mark>, b: Record<string, Mark>): Record<string, Mark> {
  const out = { ...a };
  for (const [k, m] of Object.entries(b)) {
    if (!out[k] || m.t > out[k].t) out[k] = m;
  }
  return out;
}

export function mergeStates(a: SharedState, b: SharedState): SharedState {
  const deleted = new Set([...a.shopDeleted, ...b.shopDeleted]);
  const byId = new Map(a.shopItems.map((i) => [i.id, i]));
  for (const i of b.shopItems) byId.set(i.id, i);
  const newerOrder = b.shopOrderT >= a.shopOrderT ? b : a;
  return {
    shopItems: [...byId.values()].filter((i) => !deleted.has(i.id)),
    shopDeleted: [...deleted],
    shopOrder: newerOrder.shopOrder,
    shopOrderT: newerOrder.shopOrderT,
    shopDone: mergeMarks(a.shopDone, b.shopDone),
    visited: mergeMarks(a.visited, b.visited),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

function syncUrl(): string | null {
  if (!ENDPOINT || !ENDPOINT.startsWith('https://')) return null;
  return new URL('/state', ENDPOINT).toString();
}

function pin(): string {
  return loadJson<string>('tripPin', '').trim();
}

function configured(): boolean {
  return pin().length > 0 && syncUrl() !== null;
}

async function request(method: 'GET' | 'PUT', body?: string): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    return await fetch(syncUrl()!, {
      method,
      headers: { 'X-Trip-Pin': pin(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body,
      signal: abort.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Debounced push; adopts the merged result the server returns. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleStatePush(): void {
  if (!configured()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    try {
      const res = await request('PUT', JSON.stringify(loadState()));
      if (res.ok) saveJson('sharedState', (await res.json()) as SharedState);
    } catch {
      /* offline — the next app open pulls/merges and pushes again */
    }
  }, 1500);
}

/** Pull at app start / foreground; returns true if the local copy changed. */
export async function pullState(): Promise<boolean> {
  if (!configured()) return false;
  try {
    const res = await request('GET');
    if (!res.ok) return false;
    const remote = (await res.json()) as SharedState;
    const local = loadState();
    const merged = mergeStates(remote, local); // local wins ties
    const changedLocally = JSON.stringify(merged) !== JSON.stringify(local);
    const serverMissesSomething = JSON.stringify(merged) !== JSON.stringify(remote);
    saveJson('sharedState', merged);
    if (serverMissesSomething) scheduleStatePush();
    return changedLocally;
  } catch {
    return false;
  }
}

/** React hook over the shared state; every update also schedules a push. */
export function useSharedState() {
  const [state, setState] = usePersistentState<SharedState>('sharedState', loadState());
  const update = (fn: (s: SharedState) => SharedState) => {
    setState((prev) => ({ ...fn(prev), updatedAt: Date.now() }));
    scheduleStatePush();
  };
  return { state, update };
}
