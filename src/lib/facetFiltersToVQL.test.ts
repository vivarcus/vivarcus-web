import { describe, expect, it } from "vitest";
import type { ListColumn } from "../api/types";
import { FACET_UNDEFINED_VALUE } from "./facetFilters";
import { facetFiltersToVQL, resolveDatePresetRange } from "./facetFiltersToVQL";

function col(field_api_name: string, field_type: string): ListColumn {
  return {
    field_api_name,
    field_type,
    label: { text: field_api_name },
  } as ListColumn;
}

describe("resolveDatePresetRange", () => {
  // Wednesday 2026-07-15 local
  const ref = new Date(2026, 6, 15);

  it("resolves today and yesterday", () => {
    expect(resolveDatePresetRange("today", ref)).toEqual({
      from: "2026-07-15",
      to: "2026-07-15",
    });
    expect(resolveDatePresetRange("yesterday", ref)).toEqual({
      from: "2026-07-14",
      to: "2026-07-14",
    });
  });

  it("resolves week bounds Sunday–Saturday", () => {
    // 2026-07-15 is Wednesday → week starts 2026-07-12
    expect(resolveDatePresetRange("this_week", ref)).toEqual({
      from: "2026-07-12",
      to: "2026-07-18",
    });
  });

  it("resolves current_month", () => {
    expect(resolveDatePresetRange("current_month", ref)).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});

describe("facetFiltersToVQL", () => {
  it("uses .id for object reference fields", () => {
    const vql = facetFiltersToVQL(
      { study__v: { op: "in", values: ["V0A000000001001"] } },
      [col("study__v", "Object")],
    );
    expect(vql).toBe("study__v.id = 'V0A000000001001'");
  });

  it("uses CONTAINS for multi-value in", () => {
    const vql = facetFiltersToVQL(
      { status__v: { op: "in", values: ["draft__v", "active__v"] } },
      [col("status__v", "Picklist")],
    );
    expect(vql).toBe("status__v CONTAINS ('draft__v', 'active__v')");
  });

  it("uses = for single-value equals and AND CONTAINS for multi equals", () => {
    expect(
      facetFiltersToVQL({ status__v: { op: "equals", values: ["draft__v"] } }, [
        col("status__v", "Picklist"),
      ]),
    ).toBe("status__v = 'draft__v'");

    expect(
      facetFiltersToVQL(
        { status__v: { op: "equals", values: ["draft__v", "active__v"] } },
        [col("status__v", "Picklist")],
      ),
    ).toBe("(status__v CONTAINS 'draft__v' AND status__v CONTAINS 'active__v')");
  });

  it("builds date before/after/range clauses", () => {
    expect(
      facetFiltersToVQL(
        { start_date__v: { op: "before", values: ["2026-01-01"] } },
        [col("start_date__v", "Date")],
      ),
    ).toBe("start_date__v < '2026-01-01'");

    expect(
      facetFiltersToVQL(
        { start_date__v: { op: "after", values: ["2026-01-01"] } },
        [col("start_date__v", "Date")],
      ),
    ).toBe("start_date__v > '2026-01-01'");

    expect(
      facetFiltersToVQL(
        {
          start_date__v: { op: "range", values: ["2026-01-01", "2026-01-31"] },
        },
        [col("start_date__v", "Date")],
      ),
    ).toBe("(start_date__v >= '2026-01-01' AND start_date__v <= '2026-01-31')");
  });

  it("resolves date presets into range VQL", () => {
    const ref = new Date(2026, 6, 15);
    const vql = facetFiltersToVQL(
      { start_date__v: { op: "range", preset: "today" } },
      [col("start_date__v", "Date")],
      ref,
    );
    expect(vql).toBe("(start_date__v >= '2026-07-15' AND start_date__v <= '2026-07-15')");
  });

  it("resolves relative last_n / not_last_n date filters", () => {
    const ref = new Date(2026, 6, 15);
    expect(
      facetFiltersToVQL(
        { start_date__v: { op: "last_n", values: ["7", "days"] } },
        [col("start_date__v", "Date")],
        ref,
      ),
    ).toBe("(start_date__v >= '2026-07-09' AND start_date__v <= '2026-07-15')");

    expect(
      facetFiltersToVQL(
        { start_date__v: { op: "not_last_n", values: ["7", "days"] } },
        [col("start_date__v", "Date")],
        ref,
      ),
    ).toBe(
      "(start_date__v = null OR start_date__v < '2026-07-09' OR start_date__v > '2026-07-15')",
    );
  });

  it("builds number and blank clauses", () => {
    expect(
      facetFiltersToVQL({ score__v: { op: "in", values: ["12"] } }, [col("score__v", "Number")]),
    ).toBe("score__v = 12");
    expect(
      facetFiltersToVQL({ score__v: { op: "blank" } }, [col("score__v", "Number")]),
    ).toBe("score__v = null");
  });

  it("ORs undefined with defined values", () => {
    const vql = facetFiltersToVQL(
      {
        status__v: { op: "in", values: ["draft__v", FACET_UNDEFINED_VALUE] },
      },
      [col("status__v", "Picklist")],
    );
    expect(vql).toBe("(status__v = 'draft__v' OR status__v = null)");
  });
});
