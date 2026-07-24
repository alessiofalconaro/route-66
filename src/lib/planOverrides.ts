// Merge layer for the Chicago plan: bundled CHICAGO_PLAN (read-only) + the
// user's localStorage overrides = the plan actually shown. Same philosophy
// as lib/overrides.ts for the itinerary — editing NEVER touches the data file.

import { useCallback } from 'react';
import type { PlanDay, PlanStep } from '../data/chicagoPlan';
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
    steps.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
    });
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

  return { overrides, removeStep, editStep, addStep, moveStep, resetPlan };
}
