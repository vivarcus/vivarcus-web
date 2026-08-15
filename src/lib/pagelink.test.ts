import { describe, expect, it } from "vitest";
import { vaultPagelinkHref } from "./pagelink";

describe("vaultPagelinkHref", () => {
  it("builds object record routes with tab", () => {
    expect(
      vaultPagelinkHref("v1", "/objects/study__v/records/abc/edit", "studies"),
    ).toBe("/objects/study__v/records/abc/edit?tab=studies");
  });

  it("builds page routes without tab", () => {
    expect(vaultPagelinkHref("v1", "/pages/home__v", "studies")).toBe(
      "/pages/home__v",
    );
  });
});
