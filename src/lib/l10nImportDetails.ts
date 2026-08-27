import type { LanguageRegionImportRowDetail } from "../api/types";

export type { LanguageRegionImportRowDetail };

const DETAIL_HEADER = [
  "File",
  "Type",
  "Key",
  "Property",
  "Base Language Label",
  "Translated Label",
  "Language",
  "Reason",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function importDetailsCsv(
  rows: LanguageRegionImportRowDetail[],
  outcome: LanguageRegionImportRowDetail["outcome"],
): string {
  const selected = rows.filter((row) => row.outcome === outcome);
  const lines = [
    DETAIL_HEADER.join(","),
    ...selected.map((row) =>
      [
        row.file ?? "",
        row.type ?? "",
        row.key,
        row.property ?? "",
        row.base_label ?? "",
        row.translated_label,
        row.language,
        row.reason ?? "",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  return lines.join("\n") + "\n";
}

export function downloadTextFile(filename: string, contents: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
