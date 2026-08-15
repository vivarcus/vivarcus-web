// Formatting helpers for the admin metadata viewer.

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

/** Classify an object source api-name suffix into a localized label. */
const SOURCE_LABELS: Record<string, string> = {
  standard: "Standard",
  system: "System",
  custom: "Custom",
  application: "Application",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
