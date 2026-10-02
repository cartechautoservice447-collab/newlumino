import { useCallback, useLayoutEffect, useRef } from "react";

type AnyCallback = (...args: any[]) => any;

/**
 * Returns a callback whose identity stays stable while its implementation
 * always points at the latest callback supplied by the parent.
 *
 * An undefined callback is represented by a stable no-op, which keeps
 * optional event props safe to invoke without changing their call sites.
 */
export function useStableCallback<T extends AnyCallback>(callback: T | undefined): T {
  const callbackRef = useRef<AnyCallback | undefined>(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(((...args: Parameters<T>) => {
    return callbackRef.current?.(...args) as ReturnType<T>;
  }) as T, []);
}
