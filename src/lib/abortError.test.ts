import { describe, expect, it } from "vitest";
import { isAbortError } from "./abortError";

describe("isAbortError", () => {
  it("matches AbortError by name even when not an Error instance", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("ignores ordinary errors", () => {
    expect(isAbortError(new Error("record forbidden"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
