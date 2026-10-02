import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// One MediaQueryList shared by every consumer. The "change" event only fires
// when the breakpoint is actually crossed, so resizing within the mobile or
// desktop range never triggers a React update.
let mql: MediaQueryList | null = null;

function getMql(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  if (!mql) mql = window.matchMedia(MOBILE_QUERY);
  return mql;
}

function subscribe(onStoreChange: () => void) {
  const list = getMql();
  if (!list) return () => {};
  list.addEventListener("change", onStoreChange);
  return () => list.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  const list = getMql();
  if (list) return list.matches;
  return typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
