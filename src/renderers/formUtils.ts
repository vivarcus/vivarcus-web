import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { FormElement, PicklistEntryOption } from "../api/types";
import {
  datePickerInputFormats,
  normalizeDateInputText,
  parseTimeToUtcDate,
  timeWallClockToRfc3339,
  utcInstantToWallClock,
  wallClockToUtcIso,
  type WallClock,
} from "../lib/i18n/dateFormat";
import { displayText } from "../lib/i18n";
import type { DisplayContext, DisplayText as DisplayTextValue } from "../lib/i18n/types";

dayjs.extend(customParseFormat);

export function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return false;
}

export function resolvePicklistOptions(element: {
  picklist_options?: PicklistEntryOption[];
  field_render?: FormElement["field_render"];
}): PicklistEntryOption[] {
  return element.picklist_options ?? element.field_render?.picklist_options ?? [];
}

/** Active options plus any selected values missing from the list (e.g. inactive entries). */
export function resolvePicklistOptionsWithCurrentValues(
  element: {
    picklist_options?: PicklistEntryOption[];
    field_render?: FormElement["field_render"];
  },
  selected: string[],
): PicklistEntryOption[] {
  const options = [...resolvePicklistOptions(element)];
  const hasInactiveFromServer = options.some((entry) => entry.inactive);
  if (hasInactiveFromServer) {
    return options;
  }
  const displayFallback = element.field_render?.display_value;
  const displayLabels =
    typeof displayFallback === "string" && displayFallback.trim()
      ? displayFallback.split(",").map((part) => part.trim()).filter(Boolean)
      : [];

  for (let index = 0; index < selected.length; index += 1) {
    const name = selected[index];
    if (!name || options.some((entry) => entry.name === name)) {
      continue;
    }
    let label = name;
    if (displayLabels.length === selected.length) {
      label = displayLabels[index] || name;
    } else if (displayLabels.length === 1 && selected.length === 1) {
      label = displayLabels[0];
    }
    options.push({
      name,
      label,
      inactive: true,
      selectable: false,
    });
  }
  return options;
}

export function picklistSelectOptions(
  options: PicklistEntryOption[],
): Array<{ value: string; label: string; disabled?: boolean }> {
  return options.map((entry) => ({
    value: entry.name,
    label: entry.label,
    disabled: entry.inactive || entry.selectable === false,
  }));
}

/** Ant Design Select props for single/multi picklist fields. */
export const PICKLIST_SEARCH_OPTION_THRESHOLD = 6;

export type PicklistSelectBehavior = {
  showSearch: boolean;
  virtual: boolean;
  optionFilterProp: "label";
};

/** Keep all options in the dropdown DOM (no virtual scroll) so portal lists stay reachable. */
export function picklistSelectBehavior(optionCount: number): PicklistSelectBehavior {
  return {
    showSearch: optionCount > PICKLIST_SEARCH_OPTION_THRESHOLD,
    virtual: false,
    optionFilterProp: "label",
  };
}

export function resolveReferenceOptions(element: {
  reference_options?: PicklistEntryOption[];
  field_render?: FormElement["field_render"];
}): PicklistEntryOption[] {
  return element.reference_options ?? element.field_render?.reference_options ?? [];
}

export function hasReferenceOptions(element: {
  reference_options?: PicklistEntryOption[];
  field_render?: FormElement["field_render"];
}): boolean {
  const raw = element.reference_options ?? element.field_render?.reference_options;
  return raw !== undefined;
}

export function normalizePicklistSelection(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (value == null || value === "") {
    return [];
  }
  return [String(value)];
}

export function isFieldRequired(element: FormElement): boolean {
  // Veeva does not mark locked / system-managed fields with a required asterisk.
  if (isFieldDisabled(element)) {
    return false;
  }
  if (Boolean(element.required)) {
    return true;
  }
  const fr = element.field_render;
  if (!fr || fr.requiredness !== "required") {
    return false;
  }
  return fr.editability === "editable";
}

export function isFieldDisabled(element: FormElement): boolean {
  return Boolean(element.read_only) || element.field_render?.editability === "readonly";
}

export function resolveTargetObjectApiName(element: FormElement): string {
  return (
    element.target_object_api_name?.trim() ||
    element.field_render?.target_object_api_name?.trim() ||
    ""
  );
}

export function resolveRelationshipCriteria(element: FormElement): string {
  return element.field_render?.relationship_criteria?.trim() ?? "";
}

export function resolveFieldLabel(element: FormElement): string {
  return displayText(element.label, element.field_api_name ?? "");
}

/** Prefer server diagnostic/validation text, then a localized fallback. */
export function resolveFieldUnavailableMessage(
  element: FormElement,
  fallback: DisplayTextValue,
): string {
  const diagnostic = element.field_render?.diagnostic_ref?.message?.trim();
  if (diagnostic) {
    return diagnostic;
  }
  const validation = element.field_render?.validation_message?.[0]?.trim();
  if (validation) {
    return validation;
  }
  return displayText(fallback);
}

export function parseDayjsValue(value: unknown, displayContext?: DisplayContext) {
  if (value == null || value === "") {
    return null;
  }
  const raw = normalizeDateInputText(String(value));
  if (!raw) {
    return null;
  }
  for (const format of datePickerInputFormats(displayContext, false)) {
    const strict = dayjs(raw, format, true);
    if (strict.isValid()) {
      return strict;
    }
  }
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed : null;
}

function wallClockToDayjs(wall: WallClock): Dayjs {
  return dayjs()
    .year(wall.year)
    .month(wall.month - 1)
    .date(wall.day)
    .hour(wall.hour)
    .minute(wall.minute)
    .second(0)
    .millisecond(0);
}

/** Parses a stored UTC DateTime into a picker value in the user's timezone. */
export function parseDateTimeDayjsValue(
  value: unknown,
  displayContext?: DisplayContext,
): Dayjs | null {
  if (value == null || value === "") {
    return null;
  }
  const instant = new Date(String(value));
  if (Number.isNaN(instant.getTime())) {
    return null;
  }
  return wallClockToDayjs(utcInstantToWallClock(instant, displayContext));
}

/** Serializes a picker DateTime in the user's timezone to UTC ISO-8601. */
export function dateTimeDayjsToUtcIso(
  value: Dayjs | null,
  displayContext?: DisplayContext,
): string {
  if (!value) {
    return "";
  }
  const wall: WallClock = {
    year: value.year(),
    month: value.month() + 1,
    day: value.date(),
    hour: value.hour(),
    minute: value.minute(),
  };
  return wallClockToUtcIso(wall, displayContext);
}

export function resolveFieldScale(element: FormElement): number | undefined {
  const scale = element.field_render?.scale;
  return scale != null && scale >= 0 ? scale : undefined;
}

/** Parses a stored Time field into a picker value (UTC wall-clock, no timezone). */
export function parseTimeDayjsValue(value: unknown): Dayjs | null {
  const parsed = parseTimeToUtcDate(value);
  if (!parsed) {
    return null;
  }
  return dayjs()
    .year(1970)
    .month(0)
    .date(1)
    .hour(parsed.getUTCHours())
    .minute(parsed.getUTCMinutes())
    .second(parsed.getUTCSeconds())
    .millisecond(0);
}

/** Serializes a Time picker value as RFC3339 UTC on 1970-01-01. */
export function timeDayjsToRfc3339(value: Dayjs | null): string {
  if (!value) {
    return "";
  }
  return timeWallClockToRfc3339(value.hour(), value.minute(), value.second());
}
