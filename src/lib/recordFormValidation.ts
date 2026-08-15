import type { FormElement, FormSection } from "../api/types";
import type { DisplayText } from "./i18n/types";
import { displayText, displayTextTemplate } from "./i18n";
import { recordFieldDomId, scrollToRecordSection, sectionDomId } from "../components/record/recordSectionUtils";

export function isEmptySubmittedValue(raw: unknown): boolean {
  if (raw == null) {
    return true;
  }
  if (typeof raw === "string") {
    return raw.trim() === "";
  }
  if (Array.isArray(raw)) {
    return raw.length === 0;
  }
  return String(raw).trim() === "";
}

/** Mirrors backend validateSubmittedRequiredFields writable-field checks. */
export function isWritableRequiredField(element: FormElement): boolean {
  if (element.kind !== "field" || element.hidden || element.read_only || !element.field_api_name) {
    return false;
  }
  const fr = element.field_render;
  if (fr) {
    return (
      fr.requiredness === "required" &&
      fr.editability === "editable" &&
      fr.visibility === "visible"
    );
  }
  return Boolean(element.required);
}

export function fieldLabelText(element: FormElement): string {
  return displayText(element.label, element.field_api_name ?? "").trim();
}

export function requiredFieldMessage(label: string, template: DisplayText): string {
  const trimmed = label.trim() || "Field";
  return displayTextTemplate(template, { field: trimmed }, `${trimmed} is required`);
}

export type RecordFormValidationResult = {
  valid: boolean;
  fieldErrors: Record<string, string>;
  firstErrorMessage: string | null;
};

export type RecordFormValidationOptions = {
  invalidEmailMessage?: DisplayText;
};

export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return false;
  }
  const domain = trimmed.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

function fieldFormatMaskSubtype(element: FormElement): string {
  return String(element.field_render?.subtype ?? "").trim().toLowerCase();
}

function shouldValidateEmailFormat(element: FormElement): boolean {
  if (fieldFormatMaskSubtype(element) === "email") {
    return true;
  }
  const name = element.field_api_name ?? "";
  return name === "email__sys" || name === "email__clin";
}

export function validateRecordFormSections(
  sections: FormSection[],
  values: Record<string, unknown>,
  requiredMessage: DisplayText,
  options: RecordFormValidationOptions = {},
): RecordFormValidationResult {
  const fieldErrors: Record<string, string> = {};
  let firstErrorMessage: string | null = null;

  const invalidEmailMessage = displayText(
    options.invalidEmailMessage,
    "Please enter a valid email",
  );

  for (const section of sections) {
    for (const element of section.elements) {
      if (!isWritableRequiredField(element) || !element.field_api_name) {
        continue;
      }
      if (!isEmptySubmittedValue(values[element.field_api_name])) {
        continue;
      }
      const message = requiredFieldMessage(fieldLabelText(element), requiredMessage);
      fieldErrors[element.field_api_name] = message;
      if (!firstErrorMessage) {
        firstErrorMessage = message;
      }
    }
  }

  for (const section of sections) {
    for (const element of section.elements) {
      if (element.kind !== "field" || !element.field_api_name || element.hidden || element.read_only) {
        continue;
      }
      if (!shouldValidateEmailFormat(element)) {
        continue;
      }
      const fr = element.field_render;
      if (fr && (fr.editability !== "editable" || fr.visibility !== "visible")) {
        continue;
      }
      const raw = values[element.field_api_name];
      if (typeof raw !== "string" || isValidEmailAddress(raw)) {
        continue;
      }
      if (fieldErrors[element.field_api_name]) {
        continue;
      }
      fieldErrors[element.field_api_name] = invalidEmailMessage;
      if (!firstErrorMessage) {
        firstErrorMessage = invalidEmailMessage;
      }
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    firstErrorMessage,
  };
}

export function applyFieldValidationErrors(
  sections: FormSection[],
  fieldErrors: Record<string, string>,
): FormSection[] {
  if (Object.keys(fieldErrors).length === 0) {
    return sections;
  }
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((element) => {
      if (element.kind !== "field" || !element.field_api_name) {
        return element;
      }
      const message = fieldErrors[element.field_api_name];
      if (!message) {
        return element;
      }
      return {
        ...element,
        field_render: {
          ...element.field_render,
          field_ref: element.field_render?.field_ref ?? {
            field_api_name: element.field_api_name,
          },
          field_type: element.field_render?.field_type ?? element.field_type ?? "String",
          renderer_kind: element.field_render?.renderer_kind ?? "text_input",
          support_state: element.field_render?.support_state ?? "supported",
          visibility: element.field_render?.visibility ?? "visible",
          editability: element.field_render?.editability ?? "editable",
          requiredness: element.field_render?.requiredness ?? "required",
          required_satisfaction:
            element.field_render?.required_satisfaction ?? "needs_user_input",
          validation_message: [message],
        },
      };
    }),
  }));
}

const SERVER_REQUIRED_SUFFIX = / is required$/;
const SERVER_INVALID_EMAIL_SUFFIX = / must be a valid email address$/;

const SERVER_FIELD_MESSAGE_PATTERNS: RegExp[] = [
  / must be a valid email address$/,
  / must be a valid date and time$/,
  / must be a valid date$/,
  / must be a valid time$/,
  / must be a number$/,
  / must be a whole number$/,
  / must be Yes or No$/,
  / has an invalid value$/,
  / must be at most \d+ characters$/,
  / must have at most \d+ decimal places$/,
  / must be at least .+$/,
  / must be at most .+$/,
  / is managed by the system and cannot be changed$/,
];

function findFieldByLabel(sections: FormSection[], label: string): string | undefined {
  for (const section of sections) {
    for (const element of section.elements) {
      if (element.kind !== "field" || !element.field_api_name) {
        continue;
      }
      if (fieldLabelText(element) === label) {
        return element.field_api_name;
      }
    }
  }
  return undefined;
}

/** Maps backend `"Label is required"` errors back to a field api name when possible. */
export function mapServerErrorToFieldErrors(
  sections: FormSection[],
  message: string,
): Record<string, string> | null {
  const trimmed = message.trim();
  const emailFieldMatch = trimmed.match(/field "([^"]+)" must be a valid email address/);
  if (emailFieldMatch) {
    return { [emailFieldMatch[1]]: "Please enter a valid email" };
  }
  if (SERVER_INVALID_EMAIL_SUFFIX.test(trimmed)) {
    const label = trimmed.replace(SERVER_INVALID_EMAIL_SUFFIX, "").trim();
    const apiName = findFieldByLabel(sections, label);
    if (apiName) {
      return { [apiName]: "Please enter a valid email" };
    }
  }
  for (const pattern of SERVER_FIELD_MESSAGE_PATTERNS) {
    if (!pattern.test(trimmed)) {
      continue;
    }
    const label = trimmed.replace(pattern, "").trim();
    if (!label) {
      continue;
    }
    const apiName = findFieldByLabel(sections, label);
    if (apiName) {
      return { [apiName]: trimmed };
    }
  }
  const selectedValueMatch = trimmed.match(/^The selected value for (.+) is not allowed$/);
  if (selectedValueMatch) {
    const apiName = findFieldByLabel(sections, selectedValueMatch[1]);
    if (apiName) {
      return { [apiName]: trimmed };
    }
  }
  const selectedRecordMatch = trimmed.match(/^The selected (.+) record (?:was not found|is inactive)$/);
  if (selectedRecordMatch) {
    const apiName = findFieldByLabel(sections, selectedRecordMatch[1]);
    if (apiName) {
      return { [apiName]: trimmed };
    }
  }
  if (!SERVER_REQUIRED_SUFFIX.test(trimmed)) {
    return null;
  }
  const label = trimmed.replace(SERVER_REQUIRED_SUFFIX, "").trim();
  if (!label) {
    return null;
  }
  const apiName = findFieldByLabel(sections, label);
  if (apiName) {
    return { [apiName]: trimmed };
  }
  return null;
}

export function firstValidationErrorField(
  sections: FormSection[],
  fieldErrors: Record<string, string>,
): string | undefined {
  for (const section of sections) {
    for (const element of section.elements) {
      const name = element.field_api_name;
      if (name && fieldErrors[name]) {
        return name;
      }
    }
  }
  return undefined;
}

export function scrollToFirstFieldError(sections: FormSection[], fieldErrors: Record<string, string>) {
  const fieldApiName = firstValidationErrorField(sections, fieldErrors);
  if (!fieldApiName) {
    return;
  }
  const sectionIndex = sections.findIndex((section) =>
    section.elements.some((element) => element.field_api_name === fieldApiName),
  );
  if (sectionIndex >= 0) {
    scrollToRecordSection(sectionDomId(sections[sectionIndex], sectionIndex));
  }
  requestAnimationFrame(() => {
    document.getElementById(recordFieldDomId(fieldApiName))?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
}
