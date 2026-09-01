import { describe, expect, it } from "vitest";
import { helpSiteHomeUrl } from "./helpSite";

describe("helpSiteHomeUrl", () => {
  it("opens English help when the vault language is English", () => {
    expect(helpSiteHomeUrl("en", "zh")).toBe("https://vivarcus.com/help/en/");
    expect(helpSiteHomeUrl("en-US", "zh")).toBe("https://vivarcus.com/help/en/");
  });

  it("opens Chinese help when the vault language is Chinese", () => {
    expect(helpSiteHomeUrl("zh", "en")).toBe("https://vivarcus.com/help/zh/");
    expect(helpSiteHomeUrl("zh-CN", "en")).toBe("https://vivarcus.com/help/zh/");
  });

  it("falls back to the login language before a vault is selected", () => {
    expect(helpSiteHomeUrl(undefined, "en")).toBe("https://vivarcus.com/help/en/");
    expect(helpSiteHomeUrl(undefined, "zh")).toBe("https://vivarcus.com/help/zh/");
  });
});
