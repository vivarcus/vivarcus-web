import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, tryReloadForStaleChunk } from "./chunkLoadRecovery";

describe("isChunkLoadError", () => {
  it("matches Vite dynamic import failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: http://example.test/assets/Page-abc.js",
        ),
      ),
    ).toBe(true);
  });

  it("matches webpack-style chunk failures", () => {
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
  });

  it("ignores ordinary errors", () => {
    expect(isChunkLoadError(new Error("record forbidden"))).toBe(false);
  });
});

describe("tryReloadForStaleChunk", () => {
  let reload: ReturnType<typeof vi.fn>;

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
  });

  it("reloads once for chunk load errors", () => {
    expect(tryReloadForStaleChunk(new Error("Loading chunk 1 failed."))).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("vivarcus:chunk-reload")).toBeTruthy();
  });

  it("does not reload twice in the same session", () => {
    sessionStorage.setItem("vivarcus:chunk-reload", "1");

    expect(tryReloadForStaleChunk(new Error("Loading chunk 1 failed."))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("vivarcus:chunk-reload")).toBeNull();
  });

  it("ignores non-chunk errors", () => {
    expect(tryReloadForStaleChunk(new Error("network down"))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
