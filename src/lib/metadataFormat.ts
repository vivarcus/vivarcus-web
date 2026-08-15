// Formatting helpers for the admin metadata viewer.
import { displayText } from "./i18n";
import type { ShellChrome } from "./i18n";

/** Render an arbitrary metadata attribute value as a compact string. */
export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Classify a metadata source into its shell-localized label. */
export function sourceLabel(source: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    standard: displayText(shell.metadata_source_standard),
    system: displayText(shell.metadata_source_system),
    custom: displayText(shell.metadata_source_custom),
    application: displayText(shell.metadata_source_application),
  };
  return labels[source] ?? source;
}
