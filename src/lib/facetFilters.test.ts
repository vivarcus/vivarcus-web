import { describe, expect, it } from "vitest";
import {
  facetFiltersEqual,
  normalizeFacetFilterSpec,
  normalizeFacetFilters,
  parseFacetFilters,
  serializeFacetFilters,
} from "./facetFilters";

describe("facetFilters", () => {
  it("normalizes legacy array values", () => {
    expect(normalizeFacetFilterSpec(["a__v", "b__v"])).toEqual({
      op: "in",
      values: ["a__v", "b__v"],
    });
  });

  it("serializes basic filters as arrays", () => {
    const raw = serializeFacetFilters({
      status__v: { op: "in", values: ["draft__v"] },
    });
    expect(raw).toBe('{"status__v":["draft__v"]}');
  });

  it("serializes advanced and date preset filters as objects", () => {
    const raw = serializeFacetFilters({
      status__v: { op: "equals", values: ["draft__v", "active__v"] },
      created_date__v: { op: "range", preset: "today" },
    });
    expect(raw).toContain('"op":"equals"');
    expect(raw).toContain('"preset":"today"');
  });

  it("parses structured filters", () => {
    const parsed = parseFacetFilters(
      '{"created_date__v":{"op":"range","preset":"this_week"}}',
    );
    expect(parsed.created_date__v).toEqual({ op: "range", preset: "this_week" });
  });

  it("compares filters with operators", () => {
    const a = normalizeFacetFilters({
      status__v: { op: "contains", values: ["act"] },
    });
    const b = normalizeFacetFilters({
      status__v: { op: "contains", values: ["act"] },
    });
    expect(facetFiltersEqual(a, b)).toBe(true);
    expect(normalizeFacetFilterSpec({ op: "blank" })).toEqual({ op: "blank" });
  });
});
