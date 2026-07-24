// Chicago-plan sync: the user's edits to the day-by-day plan shared across
// the three phones through the Worker (/plan). Same PIN and merge philosophy
// as the itinerary sync; "reset to default" wins wholesale via resetAt.
import type { PlanOverrides } from './planOverrides';
import { EMPTY_PLAN_OVERRIDES } from './planOverrides';
import { loadJson, saveJson } from './storage';

const ENDPOINT: string | undefined = import.meta.env.VITE_CHAT_ENDPOINT;

export interface PlanSnapshot {
  overrides: PlanOverrides;
  updatedAt: number;
  resetAt: number;
}

function syncUrl(): string | null {
  if (!ENDPOINT || !ENDPOINT.startsWith('https://')) return null;
  return new URL('/plan', ENDPOINT).toString();
}

function pin(): string {
  return loadJson<string>('tripPin', '').trim();
}

function planSyncConfigured(): boolean {
  return pin().length > 0 && syncUrl() !== null;
}

function localSnapshot(): PlanSnapshot {
  return {
    overrides: loadJson<PlanOverrides>('planOverrides', EMPTY_PLAN_OVERRIDES),
    updatedAt: loadJson<number>('planUpdatedAt', 0),
    resetAt: loadJson<number>('planResetAt', 0),
  };
}

function saveLocal(s: PlanSnapshot): void {
  saveJson('planOverrides', s.overrides);
  saveJson('planUpdatedAt', s.updatedAt);
  saveJson('planResetAt', s.resetAt);
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

/** Debounced push; adopts the merged result the server returns. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePlanPush(): void {
  if (!planSyncConfigured()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    try {
      const res = await request('PUT', JSON.stringify(localSnapshot()));
      if (res.ok) saveLocal((await res.json()) as PlanSnapshot);
    } catch {
      /* offline — the next app open pulls/merges and pushes again */
    }
  }, 1500);
}

/** Called at app start / foreground: pull the remote plan and merge it in.
 *  Returns true if the local copy changed. */
export async function pullPlan(): Promise<boolean> {
  if (!planSyncConfigured()) return false;
  try {
    const res = await request('GET');
    if (!res.ok) return false;
    const remote = (await res.json()) as PlanSnapshot;
    const local = localSnapshot();

    if (remote.resetAt > local.resetAt) {
      saveLocal(remote); // someone reset the plan — adopt it wholesale
      return true;
    }

    // Merge remote into local (remote wins per-key conflicts).
    const addedSteps: PlanOverrides['addedSteps'] = { ...local.overrides.addedSteps };
    for (const [dayId, steps] of Object.entries(remote.overrides.addedSteps)) {
      const byId = new Map((addedSteps[dayId] ?? []).map((s) => [s.id, s]));
      for (const s of steps) byId.set(s.id, s);
      addedSteps[dayId] = [...byId.values()];
    }
    const merged: PlanSnapshot = {
      overrides: {
        removedStepIds: [
          ...new Set([...local.overrides.removedStepIds, ...remote.overrides.removedStepIds]),
        ],
        editedSteps: { ...local.overrides.editedSteps, ...remote.overrides.editedSteps },
        addedSteps,
        stepOrder: { ...local.overrides.stepOrder, ...remote.overrides.stepOrder },
      },
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
      resetAt: Math.max(local.resetAt, remote.resetAt),
    };

    const changedLocally = JSON.stringify(merged.overrides) !== JSON.stringify(local.overrides);
    const serverMissesSomething =
      JSON.stringify(merged.overrides) !== JSON.stringify(remote.overrides);
    saveLocal(merged);
    if (serverMissesSomething) schedulePlanPush();
    return changedLocally;
  } catch {
    return false; // offline — keep the local copy
  }
}
