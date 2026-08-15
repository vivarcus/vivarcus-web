import { describe, expect, it } from "vitest";
import type { ListColumn } from "../api/types";
import { formatActiveFacetSelections } from "./facetActiveFilters";
import { defaultListChrome } from "./i18n/chromeTypes";

function col(field_api_name: string, field_type: string): ListColumn {
  return {
    field_api_name,
    field_type,
    label: { text: field_api_name },
  } as ListColumn;
}

describe("formatActiveFacetSelections", () => {
  const chrome = defaultListChrome;

  it("formats date before and range with operator labels", () => {
    expect(
      formatActiveFacetSelections({
        filters: { start_date__v: { op: "before", values: ["2026-01-01"] } },
        columns: [col("start_date__v", "Date")],
        chrome,
      }),
    ).toEqual([
      {
        fieldApiName: "start_date__v",
        fieldLabel: "start_date__v",
        value: "2026-01-01",
        valueLabel: "is before: 2026-01-01",
      },
    ]);

    expect(
      formatActiveFacetSelections({
        filters: {
          start_date__v: { op: "range", values: ["2026-01-01", "2026-01-31"] },
        },
        columns: [col("start_date__v", "Date")],
        chrome,
      })[0]?.valueLabel,
    ).toBe("is in the range: 2026-01-01 – 2026-01-31");
  });

  it("formats date presets with range context", () => {
    expect(
      formatActiveFacetSelections({
        filters: { start_date__v: { op: "range", preset: "this_week" } },
        columns: [col("start_date__v", "Date")],
        chrome,
      })[0]?.valueLabel,
    ).toBe("is in the range: This Week");
  });

  it("formats relative date filters", () => {
    expect(
      formatActiveFacetSelections({
        filters: { start_date__v: { op: "last_n", values: ["7", "days"] } },
        columns: [col("start_date__v", "Date")],
        chrome,
      })[0]?.valueLabel,
    ).toBe("is in the last: 7 days");
  });

  it("formats number equals and blank", () => {
    expect(
      formatActiveFacetSelections({
        filters: { score__v: { op: "in", values: ["12"] } },
        columns: [col("score__v", "Number")],
        chrome,
      })[0]?.valueLabel,
    ).toBe("equals: 12");

    expect(
      formatActiveFacetSelections({
        filters: { score__v: { op: "blank" } },
        columns: [col("score__v", "Number")],
        chrome,
      })[0]?.valueLabel,
    ).toBe("is blank");
  });

  it("keeps one chip per basic facet value", () => {
    const chips = formatActiveFacetSelections({
      filters: { status__v: { op: "in", values: ["a__v", "b__v"] } },
      columns: [col("status__v", "Picklist")],
      chrome,
    });
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.value)).toEqual(["a__v", "b__v"]);
  });
});
