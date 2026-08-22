import { useCallback, useMemo, useRef, useState } from "react";

function snapshotEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Tracks form values against a baseline snapshot for dirty-gated save bars.
 * Call `hydrate(values)` once when server data loads; call `markSaved` after
 * a successful save (optionally with the persisted snapshot).
 */
export function useSettingsDirtyForm<T extends Record<string, unknown>>(
  initial: T,
) {
  const [values, setValues] = useState<T>(initial);
  const baselineRef = useRef<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  const isDirty = useMemo(
    () => hydrated && !snapshotEqual(values, baselineRef.current),
    [values, hydrated],
  );

  const hydrate = useCallback((next: T) => {
    baselineRef.current = next;
    setValues(next);
    setHydrated(true);
  }, []);

  const reset = useCallback(() => {
    setValues(baselineRef.current);
  }, []);

  const markSaved = useCallback((next?: T) => {
    setValues((current) => {
      const snapshot = next ?? current;
      baselineRef.current = snapshot;
      return snapshot;
    });
    setHydrated(true);
  }, []);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  return {
    values,
    setValues,
    setField,
    isDirty,
    hydrated,
    hydrate,
    reset,
    markSaved,
  };
}
