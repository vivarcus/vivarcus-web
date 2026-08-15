import { describe, expect, it } from "vitest";
import { recordEditHref, recordViewPathname } from "./recordEditHref";

describe("recordEditHref", () => {
  it("builds edit path with optional tab", () => {
    expect(recordEditHref("study__v", "S-1")).toBe("/objects/study__v/records/S-1/edit");
    expect(recordEditHref("study__v", "S-1", { tabApiName: "studies" })).toBe(
      "/objects/study__v/records/S-1/edit?tab=studies",
    );
  });
});

describe("recordViewPathname", () => {
  it("strips trailing edit segment", () => {
    expect(recordViewPathname("/objects/study__v/records/S-1/edit")).toBe(
      "/objects/study__v/records/S-1",
    );
    expect(recordViewPathname("/objects/study__v/records/S-1")).toBe(
      "/objects/study__v/records/S-1",
    );
  });
});
