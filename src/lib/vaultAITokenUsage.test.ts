import { describe, expect, it } from "vitest";
import { formatTokenUsageGmt } from "./vaultAITokenUsage";

describe("formatTokenUsageGmt", () => {
  it("matches Help screenshot midnight UTC", () => {
    expect(formatTokenUsageGmt("2026-06-11T00:00:00.000Z")).toBe("06/11/2026 12:00 AM GMT");
  });

  it("matches Help screenshot hourly window end", () => {
    expect(formatTokenUsageGmt("2026-06-11T06:00:00.000Z")).toBe("06/11/2026 06:00 AM GMT");
  });

  it("keeps empty and invalid values", () => {
    expect(formatTokenUsageGmt(undefined)).toBe("");
    expect(formatTokenUsageGmt("not-a-date")).toBe("not-a-date");
  });
});
