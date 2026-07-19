// "Seen it!" checkmarks for POIs — SHARED across the three phones via the
// state sync (per-entry timestamps, so unchecking propagates too).
import { useSharedState } from './stateSync';

export function useVisited() {
  const { state, update } = useSharedState();
  const isVisited = (poiId: string) => state.visited[poiId]?.v ?? false;
  const toggleVisited = (poiId: string) =>
    update((s) => ({
      ...s,
      visited: {
        ...s.visited,
        [poiId]: { v: !(s.visited[poiId]?.v ?? false), t: Date.now() },
      },
    }));
  return { isVisited, toggleVisited };
}
