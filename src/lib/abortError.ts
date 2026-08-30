/** True when fetch() (or AbortController.abort) rejected because the request was cancelled. */
export function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  return "name" in err && (err as { name: string }).name === "AbortError";
}
