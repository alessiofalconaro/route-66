// Travelers list + per-device "who am I" (CLAUDE.md section 5).
// No accounts: names live in localStorage, referenced everywhere by a STABLE
// id so renaming "Falco" → "Alessio" never corrupts old expenses.

import type { Traveler } from '../types';
import { usePersistentState } from './storage';

export const DEFAULT_TRAVELERS: Traveler[] = [
  { id: 't1', name: 'Falco' },
  { id: 't2', name: 'Jesse' },
  { id: 't3', name: 'Geo' },
];

export function useTravelers() {
  const [travelers, setTravelers] = usePersistentState<Traveler[]>(
    'travelers',
    DEFAULT_TRAVELERS,
  );
  // whoAmI = the Traveler.id of the person using THIS phone (cosmetic only)
  const [whoAmI, setWhoAmI] = usePersistentState<string | null>('whoami', null);

  const rename = (id: string, name: string) =>
    setTravelers((list) => list.map((t) => (t.id === id ? { ...t, name } : t)));

  const nameOf = (id: string) => travelers.find((t) => t.id === id)?.name ?? '?';

  return { travelers, rename, nameOf, whoAmI, setWhoAmI };
}
