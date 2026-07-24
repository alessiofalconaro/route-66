// Photo blob store on IndexedDB.
//
// WHY: localStorage holds only ~5 MB (and browsers count every character as
// 2 bytes), so storing photos there as data-URLs filled it up and silently
// lost edits. IndexedDB has hundreds of MB. So:
//   - localStorage keeps a tiny MARKER:  photo = "idb:<poiId>"
//   - IndexedDB keeps the actual data-URL under that id
//   - the SYNC WIRE FORMAT is unchanged: pushes inflate markers back to full
//     data-URLs and pulls deflate them again, so the Worker, the KV store and
//     phones running older versions all keep working.
//
// Java analogy: a small async DAO over a key-value table, plus two mappers
// (inflate/deflate) between the storage model and the transfer model.

import { useEffect, useState } from 'react';
import type { UserOverrides } from '../types';
import { EMPTY_OVERRIDES } from '../types';
import { loadJson, saveJson } from './storage';

const DB_NAME = 'r66-photos';
const STORE = 'photos';

export const PHOTO_REF_PREFIX = 'idb:';
export const photoRef = (id: string): string => PHOTO_REF_PREFIX + id;
export const isPhotoRef = (p?: string): boolean => !!p && p.startsWith(PHOTO_REF_PREFIX);
const refId = (ref: string): string => ref.slice(PHOTO_REF_PREFIX.length);

// One shared connection, opened lazily on first use.
let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/** Runs one request in a transaction and resolves with its result. */
function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

// In-memory cache so cards don't hit IndexedDB on every render.
const cache = new Map<string, string>();

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  cache.set(id, dataUrl);
  await tx('readwrite', (s) => s.put(dataUrl, id));
}

export async function getPhoto(id: string): Promise<string | undefined> {
  const hit = cache.get(id);
  if (hit) return hit;
  const v = await tx<string | undefined>('readonly', (s) => s.get(id));
  if (v) cache.set(id, v);
  return v;
}

export async function deletePhoto(id: string): Promise<void> {
  cache.delete(id);
  await tx('readwrite', (s) => s.delete(id));
}

/** Every stored photo with its approximate size in bytes (biggest first). */
export async function listPhotos(): Promise<{ id: string; bytes: number }[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const out: { id: string; bytes: number }[] = [];
    const req = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        out.push({ id: String(c.key), bytes: (c.value as string).length });
        c.continue();
      } else {
        resolve(out.sort((a, b) => b.bytes - a.bytes));
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Mappers between the two representations of the overrides object.
// ---------------------------------------------------------------------------

const isInline = (p?: string): boolean => !!p && p.startsWith('data:');

/** Storage model: every inline data-URL is moved into IndexedDB and replaced
 *  by an "idb:" marker. Used before saving overrides to localStorage. */
export async function deflateOverrides(ov: UserOverrides): Promise<UserOverrides> {
  const editedPois: UserOverrides['editedPois'] = {};
  for (const [id, p] of Object.entries(ov.editedPois)) {
    if (isInline(p.photo)) {
      await putPhoto(id, p.photo!);
      editedPois[id] = { ...p, photo: photoRef(id) };
    } else {
      editedPois[id] = p;
    }
  }
  const addedPois: UserOverrides['addedPois'] = {};
  for (const [seg, pois] of Object.entries(ov.addedPois)) {
    const list = [];
    for (const p of pois) {
      if (isInline(p.photo)) {
        await putPhoto(p.id, p.photo!);
        list.push({ ...p, photo: photoRef(p.id) });
      } else {
        list.push(p);
      }
    }
    addedPois[seg] = list;
  }
  return { ...ov, editedPois, addedPois };
}

/** Transfer model: every "idb:" marker is replaced by the full data-URL
 *  (for sync pushes and file exports). A marker whose blob is missing
 *  becomes "no photo" rather than a broken reference. */
export async function inflateOverrides(ov: UserOverrides): Promise<UserOverrides> {
  const editedPois: UserOverrides['editedPois'] = {};
  for (const [id, p] of Object.entries(ov.editedPois)) {
    editedPois[id] = isPhotoRef(p.photo) ? { ...p, photo: await getPhoto(refId(p.photo!)) } : p;
  }
  const addedPois: UserOverrides['addedPois'] = {};
  for (const [seg, pois] of Object.entries(ov.addedPois)) {
    const list = [];
    for (const p of pois) {
      list.push(isPhotoRef(p.photo) ? { ...p, photo: await getPhoto(refId(p.photo!)) } : p);
    }
    addedPois[seg] = list;
  }
  return { ...ov, editedPois, addedPois };
}

/**
 * Deletes stored blobs that no longer have a marker pointing at them.
 *
 * WHY: when another phone deletes a photo, the sync removes the MARKER from
 * our overrides, but the blob would stay behind in IndexedDB — invisible on
 * the stop yet still listed in Settings and still using space. Pruning after
 * every merge makes "delete" actually mean delete on every phone.
 * Returns how many blobs were removed.
 */
export async function pruneOrphanPhotos(ov: UserOverrides): Promise<number> {
  const referenced = new Set<string>();
  for (const p of Object.values(ov.editedPois)) {
    if (isPhotoRef(p.photo)) referenced.add(refId(p.photo!));
  }
  for (const pois of Object.values(ov.addedPois)) {
    for (const p of pois) if (isPhotoRef(p.photo)) referenced.add(refId(p.photo!));
  }
  let removed = 0;
  for (const { id } of await listPhotos()) {
    if (!referenced.has(id)) {
      await deletePhoto(id);
      removed++;
    }
  }
  return removed;
}

/** One-time startup migration (idempotent): if the saved overrides still
 *  carry inline photos (old app versions, or a restored backup), move them
 *  to IndexedDB and free the localStorage quota. Returns true if changed. */
export async function migratePhotosToIdb(): Promise<boolean> {
  const ov = loadJson<UserOverrides>('overrides', EMPTY_OVERRIDES);
  const hasInline =
    Object.values(ov.editedPois).some((p) => isInline(p.photo)) ||
    Object.values(ov.addedPois).some((pois) => pois.some((p) => isInline(p.photo)));
  if (!hasInline) return false;
  saveJson('overrides', await deflateOverrides(ov));
  return true;
}

/** React hook: resolves a photo reference to something an <img> can show.
 *  Plain URLs / paths / data-URLs pass through; "idb:" markers load async. */
export function usePhoto(ref?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    isPhotoRef(ref) ? cache.get(refId(ref!)) : ref,
  );
  useEffect(() => {
    if (!isPhotoRef(ref)) {
      setUrl(ref);
      return;
    }
    const id = refId(ref!);
    const hit = cache.get(id);
    if (hit) {
      setUrl(hit);
      return;
    }
    let alive = true; // guards against setting state after unmount
    void getPhoto(id).then((v) => {
      if (alive) setUrl(v);
    });
    return () => {
      alive = false;
    };
  }, [ref]);
  return url;
}
