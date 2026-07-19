// "Seen it!" checkmarks for POIs during the trip. Just a set of poi ids in
// localStorage — device-local, like the rest of the itinerary state.
import { usePersistentState } from './storage';

export function useVisited() {
  const [visited, setVisited] = usePersistentState<string[]>('visitedPois', []);
  const isVisited = (poiId: string) => visited.includes(poiId);
  const toggleVisited = (poiId: string) =>
    setVisited((list) =>
      list.includes(poiId) ? list.filter((x) => x !== poiId) : [...list, poiId],
    );
  return { isVisited, toggleVisited };
}
