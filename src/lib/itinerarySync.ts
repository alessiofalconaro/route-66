// Itinerary sync: the user's edits to the stops (added/edited/removed POIs,
// custom order, photos) shared across the three phones through the Worker.
// Same PIN and merge philosophy as the expenses; "reset to default" wins
// wholesale via resetAt so a reset doesn't get "un-merged" by old copies.
import type { Poi, UserOverrides } from '../types';
import { EMPTY_OVERRIDES } from '../types';
import { loadJson, saveJson } from './storage';
import {
  deflateOverrides,
  inflateOverrides,
  pruneOrphanPhotos,
  putPhoto,
  photoRef,
} from './photoStore';

const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

export interface ItinerarySnapshot {
  overrides: UserOverrides;
  updatedAt: number;
  resetAt: number;
}

function syncUrl(): string | null {
  // https only — except a local Worker (wrangler dev) for development tests.
  if (!ENDPOINT || !(ENDPOINT.startsWith('https://') || ENDPOINT.startsWith('http://localhost'))) {
    return null;
  }
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
 *  returns. Debounced so rapid edits (reordering!) become one request.
 *  Photos travel INFLATED (full data-URLs) so the wire format — and the
 *  Worker — are unchanged; what we store back locally is deflated again. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleItineraryPush(): void {
  if (!itinerarySyncConfigured()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    try {
      const local = localSnapshot();
      const wire = { ...local, overrides: await inflateOverrides(local.overrides) };
      const res = await request('PUT', JSON.stringify(wire));
      if (res.ok) {
        const merged = (await res.json()) as ItinerarySnapshot;
        saveLocal({ ...merged, overrides: await deflateOverrides(merged.overrides) });
      }
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
    // Remote arrives INFLATED (photos are data-URLs). We keep it that way and
    // only move a photo into IndexedDB when its entry actually WINS the merge,
    // so a newer LOCAL photo is never clobbered by an older remote blob (both
    // map to the same idb key = the poi id).
    const remote = (await res.json()) as ItinerarySnapshot;
    const local = localSnapshot(); // photos are "idb:" markers here

    if (remote.resetAt > local.resetAt) {
      // someone reset the itinerary — adopt it wholesale (deflate its photos)
      const adopted = await deflateOverrides(remote.overrides);
      saveLocal({ ...remote, overrides: adopted });
      await pruneOrphanPhotos(adopted); // a reset drops every old photo too
      return true;
    }

    // If a winning entry carries an inline photo, store the blob and swap in a
    // marker; a marker or missing photo passes through untouched.
    const deflatePhoto = async <T extends { id?: string; photo?: string }>(
      id: string,
      entry: T,
    ): Promise<T> => {
      if (entry.photo?.startsWith('data:')) {
        await putPhoto(id, entry.photo);
        return { ...entry, photo: photoRef(id) };
      }
      return entry;
    };

    // Per-stop edits: the NEWEST edit wins (per-id timestamps). Entries with
    // no timestamp (older app versions) count as 0.
    const editedPois: UserOverrides['editedPois'] = { ...local.overrides.editedPois };
    const editedAt: Record<string, number> = { ...(local.overrides.editedAt ?? {}) };
    const remoteAt = remote.overrides.editedAt ?? {};
    let localAhead = false; // local has edits the server doesn't → re-push
    for (const [id, edit] of Object.entries(remote.overrides.editedPois)) {
      if (!(id in editedPois) || (remoteAt[id] ?? 0) >= (editedAt[id] ?? 0)) {
        editedPois[id] = await deflatePhoto(id, edit); // remote wins → take its photo
        if (remoteAt[id]) editedAt[id] = remoteAt[id];
      } else {
        localAhead = true; // local edit is newer than the server's copy
      }
    }
    for (const id of Object.keys(local.overrides.editedPois)) {
      if (!(id in remote.overrides.editedPois)) localAhead = true;
    }

    // Added POIs: merge per id, remote wins per id (deflate its photos).
    const addedPois: UserOverrides['addedPois'] = { ...local.overrides.addedPois };
    for (const [segId, pois] of Object.entries(remote.overrides.addedPois)) {
      const byId = new Map((addedPois[segId] ?? []).map((p) => [p.id, p]));
      for (const p of pois) byId.set(p.id, await deflatePhoto(p.id, p as Poi));
      addedPois[segId] = [...byId.values()];
    }

    const merged: ItinerarySnapshot = {
      overrides: {
        removedPoiIds: [
          ...new Set([...local.overrides.removedPoiIds, ...remote.overrides.removedPoiIds]),
        ],
        editedPois,
        addedPois,
        poiOrder: { ...local.overrides.poiOrder, ...remote.overrides.poiOrder },
        editedAt,
      },
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
      resetAt: Math.max(local.resetAt, remote.resetAt),
    };

    const changedLocally = JSON.stringify(merged.overrides) !== JSON.stringify(local.overrides);
    // Re-push when local carries edits the server is missing or has older —
    // localAhead covers editedPois; the set/order fields use plain unions so a
    // size change means local had something extra too.
    const serverMissesSomething =
      localAhead ||
      merged.overrides.removedPoiIds.length > remote.overrides.removedPoiIds.length ||
      Object.keys(merged.overrides.poiOrder).length >
        Object.keys(remote.overrides.poiOrder).length ||
      Object.keys(merged.overrides.addedPois).length >
        Object.keys(remote.overrides.addedPois).length;
    saveLocal(merged);
    // Drop blobs nobody points at anymore — this is how a photo deleted on
    // another phone stops taking space (and stops being listed) on this one.
    const pruned = await pruneOrphanPhotos(merged.overrides);
    if (serverMissesSomething) scheduleItineraryPush();
    return changedLocally || pruned > 0;
  } catch {
    return false; // offline — keep the local copy
  }
}
