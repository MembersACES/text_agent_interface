"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Snapshot-based dirty tracking for a single record.
 * Call `adopt` when the loaded/saved/discarded copy becomes the new baseline.
 */
export function useDirtyRecord<T>() {
  const baselineRef = useRef<{ value: T; snap: string } | null>(null);
  const [, setGen] = useState(0);

  const adopt = useCallback((value: T, snap: string) => {
    baselineRef.current = { value, snap };
    setGen((g) => g + 1);
  }, []);

  const isDirty = useCallback((currentSnap: string) => {
    if (!baselineRef.current) return false;
    return currentSnap !== baselineRef.current.snap;
  }, []);

  const baseline = useCallback((): T | null => baselineRef.current?.value ?? null, []);

  return { adopt, isDirty, baseline };
}
