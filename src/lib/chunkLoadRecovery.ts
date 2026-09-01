const RELOAD_GUARD_KEY = "vivarcus:chunk-reload";

export function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk [\da-z]+ failed/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export function tryReloadForStaleChunk(err?: unknown): boolean {
  if (err !== undefined && !isChunkLoadError(err)) {
    return false;
  }

  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    return false;
  }

  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

export function installChunkLoadRecovery(): void {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    tryReloadForStaleChunk();
  });
}
