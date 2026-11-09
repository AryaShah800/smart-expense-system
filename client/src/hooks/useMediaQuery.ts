import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. Falls back to `fallback` where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string, fallback = true): boolean {
  const subscribe = (notify: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", notify);
    return () => mql.removeEventListener("change", notify);
  };
  const getSnapshot = () =>
    typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback;
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

/** Matches the `md` breakpoint used by the responsive stylesheet. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
