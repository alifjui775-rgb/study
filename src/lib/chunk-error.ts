export const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /dynamically imported module/i,
  /Loading chunk/i,
  /ChunkLoadError/i,
  /error loading dynamically imported module/i,
  // Stale service worker / SPA fallback can serve index.html for a JS chunk,
  // producing a module MIME-type failure instead of a classic chunk error.
  /Expected a JavaScript module script/i,
  /Failed to load module script/i,
  /NS_ERROR_CORRUPTED_CONTENT/i,
  /expected expression, got/i,
  /Unexpected token/i,
  /can't access property "default"/i,
  /e\._result is undefined/i,
  /Script error/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === "string"
      ? error
      : (error as any)?.message || (error as any)?.name || (error as any)?.stack || String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Force a hard, cache-busting reload immediately.
 */
export function forceCacheBustReload(): void {
  try {
    sessionStorage.setItem("vite_chunk_reload", String(Date.now()));
    fetch(window.location.href, { cache: "reload" }).catch(() => {});
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Triggers a hard, cache-busting reload ONLY when a stale chunk load failure occurs.
 * Appends `_cb=${Date.now()}` and uses `cache: 'reload'` to ensure the browser fetches fresh `index.html`.
 * Throttled to max 1 reload per 8 seconds to prevent infinite loops.
 */
export function handleChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;

  const lastReload = Number(sessionStorage.getItem("vite_chunk_reload") || "0");
  const now = Date.now();

  if (now - lastReload > 8000) {
    forceCacheBustReload();
    return true;
  }

  return false;
}

/**
 * Strips the temporary `_cb` cache-busting parameter from the address bar after page load.
 */
export function cleanupCacheBustQuery(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("_cb")) {
      url.searchParams.delete("_cb");
      const cleanUrl = url.pathname + (url.search ? url.search : "") + url.hash;
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  } catch {
    // Ignore
  }
}
