import {
  fieldLabelText,
  findFieldByApiName,
  getPicklistSelection,
  selectPicklistField,
} from "./selectPicklistField";
import { commitInput, setNativeInputValue } from "./nativeValue";

export type FillRecordResult = {
  ok: boolean;
  filled: string[];
  errors: { fieldApiName: string; reason: string }[];
};

export type FormFieldInfo = {
  fieldApiName: string;
  label: string;
  kind: "picklist" | "date" | "checkbox" | "textarea" | "text";
  value: string | null;
};

function fieldLabel(item: HTMLElement, fallback: string): string {
  return fieldLabelText(item, fallback);
}

function fieldKind(item: HTMLElement): FormFieldInfo["kind"] {
  if (item.querySelector('[role="combobox"]')) {
    return "picklist";
  }
  if (item.querySelector(".date-field-input, .ant-picker")) {
    return "date";
  }
  if (item.querySelector('input[type="checkbox"]')) {
    return "checkbox";
  }
  if (item.querySelector("textarea")) {
    return "textarea";
  }
  return "text";
}

function textInput(item: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  return item.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input:not([type=checkbox]):not([type=hidden])");
}

export function getFieldValue(fieldApiName: string): string | null {
  const item = findFieldByApiName(fieldApiName.trim());
  if (!item) {
    return null;
  }
  return readFieldValue(item);
}

function readFieldValue(item: HTMLElement): string | null {
  const kind = fieldKind(item);
  if (kind === "picklist") {
    return getPicklistSelection(item);
  }
  if (kind === "checkbox") {
    const box = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
    return box ? String(box.checked) : null;
  }
  const input = textInput(item);
  const value = input?.value?.trim() ?? "";
  return value || null;
}

export function listFormFields(): FormFieldInfo[] {
  const out: FormFieldInfo[] = [];
  for (const item of document.querySelectorAll<HTMLElement>("[data-field-api-name]")) {
    const fieldApiName = item.getAttribute("data-field-api-name")?.trim() ?? "";
    if (!fieldApiName) {
      continue;
    }
    out.push({
      fieldApiName,
      label: fieldLabel(item, fieldApiName),
      kind: fieldKind(item),
      value: readFieldValue(item),
    });
  }
  return out;
}

function parseBool(value: string): boolean | null {
  const lowered = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(lowered)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(lowered)) {
    return false;
  }
  return null;
}

async function fillOne(item: HTMLElement, value: string): Promise<string | undefined> {
  const kind = fieldKind(item);
  if (kind === "picklist") {
    const result = await selectPicklistField(item, value);
    return result.ok ? undefined : (result.reason ?? "picklist select failed");
  }
  if (kind === "checkbox") {
    const box = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!box) {
      return "checkbox not found";
    }
    const wanted = parseBool(value);
    if (wanted === null) {
      return `invalid checkbox value: ${value}`;
    }
    if (box.checked !== wanted) {
      box.click();
    }
    return undefined;
  }
  const input = textInput(item);
  if (!input) {
    return "input not found";
  }
  input.focus();
  setNativeInputValue(input, value);
  if (kind === "date") {
    commitInput(input);
  }
  return undefined;
}

export async function fillRecord(values: Record<string, string>): Promise<FillRecordResult> {
  const filled: string[] = [];
  const errors: FillRecordResult["errors"] = [];
  for (const [rawName, rawValue] of Object.entries(values)) {
    const fieldApiName = rawName.trim();
    const value = String(rawValue ?? "");
    if (!fieldApiName) {
      continue;
    }
    const item = findFieldByApiName(fieldApiName);
    if (!item) {
      errors.push({ fieldApiName, reason: `field not found: ${fieldApiName}` });
      continue;
    }
    const reason = await fillOne(item, value);
    if (reason) {
      errors.push({ fieldApiName, reason });
      continue;
    }
    filled.push(fieldApiName);
  }
  return { ok: errors.length === 0, filled, errors };
}
