import { describe, expect, it } from "vitest";
import { isListFilterActive, listFilteredRange, listLoadedRange, listPageNavigation, listPageRange } from "./listRange";

describe("listRange", () => {
  it("detects active filters", () => {
    expect(isListFilterActive("")).toBe(false);
    expect(isListFilterActive("  ")).toBe(false);
    expect(isListFilterActive("alpha")).toBe(true);
  });

  it("builds loaded range against server total", () => {
    expect(listLoadedRange(25, 100)).toEqual({ start: 1, end: 25, total: 100 });
    expect(listLoadedRange(0, 100)).toEqual({ start: 0, end: 0, total: 100 });
  });

  it("builds page range for token navigation", () => {
    expect(listPageRange(0, 25, 25, 100)).toEqual({ start: 1, end: 25, total: 100 });
    expect(listPageRange(1, 25, 25, 100)).toEqual({ start: 26, end: 50, total: 100 });
  });

  it("builds page navigation metadata", () => {
    expect(listPageNavigation(0, 25, 100)).toEqual({ currentPage: 1, totalPages: 4 });
    expect(listPageNavigation(1, 25, 100)).toEqual({ currentPage: 2, totalPages: 4 });
  });

  it("builds filtered range for loaded rows", () => {
    expect(listFilteredRange(3, 25)).toEqual({ count: 3, loaded: 25 });
    expect(listFilteredRange(0, 25)).toEqual({ count: 0, loaded: 25 });
  });
});
