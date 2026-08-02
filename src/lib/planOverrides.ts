// Merge layer for the day-by-day plans: bundled TRIP_PLAN (read-only) + the
// user's localStorage overrides = the plan actually shown. Same philosophy
// as lib/overrides.ts for the itinerary — editing NEVER touches the data file.
//
// NOTE: removedStepIds/editedSteps are keyed by BARE step id across all days,
// so step ids must be globally unique (see the warning in data/plan/types.ts).

import { useCallback } from 'react';
import type { PlanDay, PlanStep } from '../data/plan/types';
import { saveJson, usePersistentState } from './storage';
import { schedulePlanPush } from './planSync';

export interface PlanOverrides {
  removedStepIds: string[];
  editedSteps: Record<string, Partial<PlanStep>>;
  addedSteps: Record<string, PlanStep[]>; // day id → custom steps
  stepOrder: Record<string, string[]>; // day id → step ids in display order
}

export const EMPTY_PLAN_OVERRIDES: PlanOverrides = {
  removedStepIds: [],
  editedSteps: {},
  addedSteps: {},
  stepOrder: {},
};

const KEY = 'planOverrides';

/** Marks the plan as changed and schedules a background sync push. */
function touchAndSync(): void {
  saveJson('planUpdatedAt', Date.now());
  schedulePlanPush();
}

/** Applies the user's edits to one day's step list (same steps as mergePois). */
export function mergePlanSteps(day: PlanDay, ov: PlanOverrides): PlanStep[] {
  let steps = day.steps.filter((s) => !ov.removedStepIds.includes(s.id));
  steps = steps.map((s) => (ov.editedSteps[s.id] ? { ...s, ...ov.editedSteps[s.id] } : s));
  const added = (ov.addedSteps[day.id] ?? []).filter((s) => !ov.removedStepIds.includes(s.id));
  steps = [...steps, ...added.map((s) => (ov.editedSteps[s.id] ? { ...s, ...ov.editedSteps[s.id] } : s))];
  const order = ov.stepOrder[day.id];
  if (order) {
    // Steps missing from a saved order (e.g. added to the bundled data after
    // the user reordered that day) keep their neighbour's position instead of
    // being dumped at the end: each unknown id inherits the rank of the last
    // known one, plus a small increment.
    const rank = new Map<string, number>();
    let last = -1;
    let gap = 0;
    for (const s of steps) {
      const i = order.indexOf(s.id);
      if (i === -1) {
        gap += 1;
        rank.set(s.id, last + gap / 1000);
      } else {
        last = i;
        gap = 0;
        rank.set(s.id, i);
      }
    }
    steps.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return steps;
}

/** Hook exposing the plan overrides plus the edit operations the UI needs. */
export function usePlanOverrides() {
  const [overrides, setOverrides] = usePersistentState<PlanOverrides>(KEY, EMPTY_PLAN_OVERRIDES);

  const removeStep = useCallback(
    (stepId: string) => {
      setOverrides((ov) => ({ ...ov, removedStepIds: [...ov.removedStepIds, stepId] }));
      touchAndSync();
    },
    [setOverrides],
  );

  const editStep = useCallback(
    (stepId: string, changes: Partial<PlanStep>) => {
      setOverrides((ov) => ({
        ...ov,
        editedSteps: { ...ov.editedSteps, [stepId]: { ...ov.editedSteps[stepId], ...changes } },
      }));
      touchAndSync();
    },
    [setOverrides],
  );

  const addStep = useCallback(
    (dayId: string, step: PlanStep) => {
      setOverrides((ov) => ({
        ...ov,
        addedSteps: { ...ov.addedSteps, [dayId]: [...(ov.addedSteps[dayId] ?? []), step] },
      }));
      touchAndSync();
    },
    [setOverrides],
  );

  /** Applies several step edits in ONE write (used by "recompute times", so
   *  the whole day is one state update and one sync push). */
  const editSteps = useCallback(
    (updates: Record<string, Partial<PlanStep>>) => {
      setOverrides((ov) => {
        const editedSteps = { ...ov.editedSteps };
        for (const [id, changes] of Object.entries(updates)) {
          editedSteps[id] = { ...editedSteps[id], ...changes };
        }
        return { ...ov, editedSteps };
      });
      touchAndSync();
    },
    [setOverrides],
  );

  /** Stores a whole new order at once (what drag-to-reorder commits). */
  const setStepOrder = useCallback(
    (dayId: string, ids: string[]) => {
      setOverrides((ov) => ({ ...ov, stepOrder: { ...ov.stepOrder, [dayId]: ids } }));
      touchAndSync();
    },
    [setOverrides],
  );

  /** Moves a step one position up or down within its day. */
  const moveStep = useCallback(
    (day: PlanDay, ov: PlanOverrides, stepId: string, direction: -1 | 1) => {
      const current = mergePlanSteps(day, ov).map((s) => s.id);
      const idx = current.indexOf(stepId);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= current.length) return;
      [current[idx], current[target]] = [current[target], current[idx]];
      setOverrides((prev) => ({
        ...prev,
        stepOrder: { ...prev.stepOrder, [day.id]: current },
      }));
      touchAndSync();
    },
    [setOverrides],
  );

  const resetPlan = useCallback(() => {
    setOverrides(EMPTY_PLAN_OVERRIDES);
    // resetAt makes the reset win over any later merge (see planSync)
    saveJson('planResetAt', Date.now());
    touchAndSync();
  }, [setOverrides]);

  /**
   * Restores ONE day to the bundled plan, leaving every other day's edits
   * alone. The day object carries the ids we need to filter the global
   * removed/edited maps. It still stamps planResetAt, because that is what
   * makes the other phones adopt this snapshot wholesale instead of merging
   * the deleted entries back in — the pushed snapshot keeps all other days.
   */
  const resetDay = useCallback(
    (day: PlanDay) => {
      setOverrides((ov) => {
        const ids = new Set<string>([
          ...day.steps.map((s) => s.id),
          ...(ov.addedSteps[day.id] ?? []).map((s) => s.id),
        ]);
        const editedSteps = Object.fromEntries(
          Object.entries(ov.editedSteps).filter(([id]) => !ids.has(id)),
        );
        const { [day.id]: _added, ...addedSteps } = ov.addedSteps;
        const { [day.id]: _order, ...stepOrder } = ov.stepOrder;
        return {
          removedStepIds: ov.removedStepIds.filter((id) => !ids.has(id)),
          editedSteps,
          addedSteps,
          stepOrder,
        };
      });
      saveJson('planResetAt', Date.now());
      touchAndSync();
    },
    [setOverrides],
  );

  return {
    overrides,
    removeStep,
    editStep,
    editSteps,
    addStep,
    moveStep,
    setStepOrder,
    resetPlan,
    resetDay,
  };
}
