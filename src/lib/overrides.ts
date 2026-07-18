// Merge layer: bundled tripData (read-only) + the user's localStorage
// overrides = the itinerary actually shown. Editing NEVER touches tripData.

import { useCallback } from 'react';
import type { Poi, Segment, UserOverrides } from '../types';
import { EMPTY_OVERRIDES } from '../types';
import { usePersistentState } from './storage';

const KEY = 'overrides';

/** Applies the user's edits to one segment's POI list. */
export function mergePois(segment: Segment, ov: UserOverrides): Poi[] {
  // 1. start from the bundled POIs, minus the removed ones
  let pois = segment.pois.filter((p) => !ov.removedPoiIds.includes(p.id));

  // 2. apply field edits ({...a, ...b} = copy a, then overwrite with b's fields)
  pois = pois.map((p) => (ov.editedPois[p.id] ? { ...p, ...ov.editedPois[p.id] } : p));

  // 3. append user-added POIs for this segment
  const added = (ov.addedPois[segment.id] ?? []).filter(
    (p) => !ov.removedPoiIds.includes(p.id),
  );
  pois = [...pois, ...added.map((p) => (ov.editedPois[p.id] ? { ...p, ...ov.editedPois[p.id] } : p))];

  // 4. apply custom ordering if the user reordered this segment
  const order = ov.poiOrder[segment.id];
  if (order) {
    pois.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      // ids not in the order list go to the end, keeping their relative order
      return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
    });
  }
  return pois;
}

/**
 * Hook exposing the overrides plus the edit operations the UI needs.
 * All updates are immutable copies — React only re-renders when it sees
 * a NEW object, so we never mutate the existing state in place.
 */
export function useOverrides() {
  const [overrides, setOverrides] = usePersistentState<UserOverrides>(KEY, EMPTY_OVERRIDES);

  const removePoi = useCallback(
    (poiId: string) =>
      setOverrides((ov) => ({ ...ov, removedPoiIds: [...ov.removedPoiIds, poiId] })),
    [setOverrides],
  );

  const editPoi = useCallback(
    (poiId: string, changes: Partial<Poi>) =>
      setOverrides((ov) => ({
        ...ov,
        editedPois: { ...ov.editedPois, [poiId]: { ...ov.editedPois[poiId], ...changes } },
      })),
    [setOverrides],
  );

  const addPoi = useCallback(
    (segmentId: string, poi: Poi) =>
      setOverrides((ov) => ({
        ...ov,
        addedPois: { ...ov.addedPois, [segmentId]: [...(ov.addedPois[segmentId] ?? []), poi] },
      })),
    [setOverrides],
  );

  /** Moves a POI one position up or down within its segment. */
  const movePoi = useCallback(
    (segment: Segment, ov: UserOverrides, poiId: string, direction: -1 | 1) => {
      const current = mergePois(segment, ov).map((p) => p.id);
      const idx = current.indexOf(poiId);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= current.length) return;
      // swap the two ids, save the full order for this segment
      [current[idx], current[target]] = [current[target], current[idx]];
      setOverrides((prev) => ({
        ...prev,
        poiOrder: { ...prev.poiOrder, [segment.id]: current },
      }));
    },
    [setOverrides],
  );

  const resetAll = useCallback(() => setOverrides(EMPTY_OVERRIDES), [setOverrides]);

  return { overrides, setOverrides, removePoi, editPoi, addPoi, movePoi, resetAll };
}
