// Small typed wrapper around localStorage plus a React hook.
// localStorage only stores strings, so we JSON-serialize everything.
// Java analogy: a tiny DAO over a key-value store, with generics.

import { useEffect, useState } from 'react';

const PREFIX = 'r66.'; // namespace all our keys to avoid collisions

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted JSON or storage disabled — never crash the app over it.
    return fallback;
  }
}

// Storage-full is worth telling the user about ONCE per session — a silent
// failure would quietly lose their edits (audit finding).
let warnedQuota = false;

export function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    if (!warnedQuota) {
      warnedQuota = true;
      const es = localStorage.getItem(PREFIX + 'lang') === '"es"';
      alert(
        es
          ? 'Memoria llena: el último cambio NO se guardó. Exporta una copia y quita alguna foto de las paradas.'
          : 'Storage is full: the last change was NOT saved. Export a backup and remove some stop photos.',
      );
    }
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/**
 * Like usePersistentState but backed by sessionStorage: the value survives
 * tab switches, reloads and briefly leaving the app, but is cleared when the
 * app is fully closed and reopened (a new session). Used by the chat.
 */
export function useSessionState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage disabled — value just lives in memory */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/**
 * React hook: like useState, but the value survives app restarts.
 *
 * JS concept — "hook": a function that plugs local state into a component.
 * Java analogy: a field on the component instance, except React re-runs the
 * component function on every render and the hook gives back the same state.
 */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => loadJson(key, fallback));

  // useEffect runs AFTER render — here: every time `value` changes, save it.
  useEffect(() => {
    saveJson(key, value);
  }, [key, value]);

  return [value, setValue] as const; // `as const` keeps the tuple types exact
}
