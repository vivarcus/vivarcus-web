import { describe, expect, it } from "vitest";
import { importDetailsCsv } from "./l10nImportDetails";
import type { LanguageRegionImportRowDetail } from "../api/types";

describe("importDetailsCsv", () => {
  const rows: LanguageRegionImportRowDetail[] = [
    {
      outcome: "success",
      key: "system:ui.save",
      translated_label: "保存",
      language: "zh",
      file: "pack.csv",
    },
    {
      outcome: "ignored",
      reason: "empty translated text",
      key: "system:ui.skip",
      translated_label: "",
      language: "zh",
    },
    {
      outcome: "error",
      reason: 'unknown, "resource"',
      key: "bad",
      translated_label: "x",
      language: "zh",
    },
  ];

  it("filters one outcome and quotes commas", () => {
    const csv = importDetailsCsv(rows, "error");
    expect(csv).toContain("bad");
    expect(csv.split("\n")[1]).toContain('"unknown, ""resource"""');
    expect(csv).not.toContain("system:ui.save");
  });

  it("includes success rows only", () => {
    const csv = importDetailsCsv(rows, "success");
    expect(csv).toContain("system:ui.save");
    expect(csv).not.toContain("system:ui.skip");
  });
});
