const KEY = "smart-expense:stale-chunk-reload";
const RETRY_AFTER_MS = 60_000;

/**
 * After a deploy, a tab (or the PWA's cached index.html) can still reference the previous build's
 * lazy-loaded files, which no longer exist, so opening a page fails with "Failed to fetch dynamically
 * imported module" and the error screen. Vite fires `vite:preloadError` for that case: reload once to pick
 * up the new build. The timestamp guard stops a reload loop if the file is missing for another reason.
 */
export function installStaleChunkReload(
  win: Pick<Window, "addEventListener"> & { location: Pick<Location, "reload"> } = window,
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
  now: () => number = Date.now
): void {
  win.addEventListener("vite:preloadError", (event: Event) => {
    const last = Number(storage.getItem(KEY) ?? 0);
    if (now() - last < RETRY_AFTER_MS) return; // already reloaded just now: let the error screen show
    storage.setItem(KEY, String(now()));
    event.preventDefault();
    win.location.reload();
  });
}
