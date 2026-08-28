import { displayText, type DisplayText } from "./i18n";

/** IANA zone id (e.g. Asia/Shanghai) when the catalog code looks like a timezone. */
export function ianaTimezoneId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("/")) {
    return trimmed;
  }
  if (trimmed.toUpperCase() === "UTC" || trimmed.toUpperCase() === "GMT") {
    return trimmed.toUpperCase() === "GMT" ? "GMT" : "UTC";
  }
  return "";
}

/**
 * Veeva Language & Region timezone labels include the IANA id, e.g.
 * "(GMT+08:00) China Standard Time (Asia/Shanghai)".
 * Append the catalog code when the picklist label omitted it.
 */
export function formatTimezoneOptionLabel(
  optionValue: string,
  optionLabel: string | DisplayText | null | undefined,
): string {
  const base = displayText(optionLabel, optionValue).trim() || optionValue.trim();
  const iana = ianaTimezoneId(optionValue);
  if (!iana) {
    return base;
  }
  if (labelAlreadyNamesZone(base, iana)) {
    return base;
  }
  return `${base} (${iana})`;
}

function labelAlreadyNamesZone(label: string, iana: string): boolean {
  const haystack = label.toLowerCase();
  if (haystack.includes(iana.toLowerCase())) {
    return true;
  }
  const slash = iana.lastIndexOf("/");
  if (slash < 0) {
    return false;
  }
  const city = iana.slice(slash + 1).replaceAll("_", " ");
  return city.length > 0 && haystack.includes(city.toLowerCase());
}
