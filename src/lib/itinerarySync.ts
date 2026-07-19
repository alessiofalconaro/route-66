// Itinerary sync: the user's edits to the stops (added/edited/removed POIs,
// custom order, photos) shared across the three phones through the Worker.
// Same PIN and merge philosophy as the expenses; "reset to default" wins
// wholesale via resetAt so a reset doesn't get "un-merged" by old copies.
import type { UserOverrides } from '../types';
import { EMPTY_OVERRIDES } from '../types';
import { loadJson, saveJson } from './storage';

const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

export interface ItinerarySnapshot {
  overrides: UserOverrides;
  updatedAt: number;
  resetAt: number;
}

function syncUrl(): string | null {
  if (!ENDPOINT || !ENDPOINT.startsWith('https://')) return null;
  return new URL('/itinerary', ENDPOINT).toString();
}

function pin(): string {
  return loadJson<string>('tripPin', '').trim();
}

export function itinerarySyncConfigured(): boolean {
  return pin().length > 0 && syncUrl() !== null;
}

/** The local snapshot as stored by useOverrides + the meta timestamps. */
export function localSnapshot(): ItinerarySnapshot {
  return {
    overrides: loadJson<UserOverrides>('overrides', EMPTY_OVERRIDES),
    updatedAt: loadJson<number>('overridesUpdatedAt', 0),
    resetAt: loadJson<number>('overridesResetAt', 0),
  };
}

function saveLocal(s: ItinerarySnapshot): void {
  saveJson('overrides', s.overrides);
  saveJson('overridesUpdatedAt', s.updatedAt);
  saveJson('overridesResetAt', s.resetAt);
}

async function request(method: 'GET' | 'PUT', body?: string): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    return await fetch(syncUrl()!, {
      method,
      headers: {
        'X-Trip-Pin': pin(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      signal: abort.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Pushes the current local snapshot; adopts the merged result the server
 *  returns. Debounced so rapid edits (reordering!) become one request. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleItineraryPush(): void {
  if (!itinerarySyncConfigured()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    try {
      const res = await request('PUT', JSON.stringify(localSnapshot()));
      if (res.ok) saveLocal((await res.json()) as ItinerarySnapshot);
    } catch {
      /* offline — the next app open pulls/merges and pushes again */
    }
  }, 1500);
}

/** Called once at app start: pull the remote itinerary and merge it in.
 *  Returns true if the local copy changed (caller may want to re-render). */
export async function pullItinerary(): Promise<boolean> {
  if (!itinerarySyncConfigured()) return false;
  try {
    const res = await request('GET');
    if (!res.ok) return false;
    const remote = (await res.json()) as ItinerarySnapshot;
    const local = localSnapshot();

    if (remote.resetAt > local.resetAt) {
      // someone reset the itinerary — adopt it wholesale
      saveLocal(remote);
      return true;
    }

    // Merge remote into local (remote wins per-key conflicts).
    const addedPois: UserOverrides['addedPois'] = { ...local.overrides.addedPois };
    for (const [segId, pois] of Object.entries(remote.overrides.addedPois)) {
      const byId = new Map((addedPois[segId] ?? []).map((p) => [p.id, p]));
      for (const p of pois) byId.set(p.id, p);
      addedPois[segId] = [...byId.values()];
    }
    const merged: ItinerarySnapshot = {
      overrides: {
        removedPoiIds: [
          ...new Set([...local.overrides.removedPoiIds, ...remote.overrides.removedPoiIds]),
        ],
        editedPois: { ...local.overrides.editedPois, ...remote.overrides.editedPois },
        addedPois,
        poiOrder: { ...local.overrides.poiOrder, ...remote.overrides.poiOrder },
      },
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
      resetAt: Math.max(local.resetAt, remote.resetAt),
    };

    const changedLocally = JSON.stringify(merged.overrides) !== JSON.stringify(local.overrides);
    const serverMissesSomething =
      JSON.stringify(merged.overrides) !== JSON.stringify(remote.overrides);
    saveLocal(merged);
    if (serverMissesSomething) scheduleItineraryPush();
    return changedLocally;
  } catch {
    return false; // offline — keep the local copy
  }
}
