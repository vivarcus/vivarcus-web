import { describe, expect, it } from "vitest";
import { filterAndRankByQuery, metadataSearchRank } from "./metadataSearchRank";

describe("metadataSearchRank", () => {
  it("ranks exact matches ahead of prefixes and substrings", () => {
    expect(metadataSearchRank("study", "Study")).toBe(0);
    expect(metadataSearchRank("study", "Study Site")).toBe(1);
    expect(metadataSearchRank("udy", "Study")).toBe(2);
    expect(metadataSearchRank("zzz", "Study")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("filterAndRankByQuery", () => {
  it("puts exact label matches before longer prefix hits", () => {
    const items = [
      { label: "Study Site", api_name: "site__v" },
      { label: "Study", api_name: "study__v" },
      { label: "Study Country", api_name: "study_country__v" },
      { label: "Product", api_name: "product__v" },
    ];
    const ranked = filterAndRankByQuery(items, "Study", (o) => [o.label, o.api_name]);
    expect(ranked.map((o) => o.api_name)).toEqual([
      "study__v",
      "site__v",
      "study_country__v",
    ]);
  });

  it("returns original order when query is empty", () => {
    const items = [{ label: "B" }, { label: "A" }];
    expect(filterAndRankByQuery(items, "  ", (o) => [o.label])).toEqual(items);
  });
});
