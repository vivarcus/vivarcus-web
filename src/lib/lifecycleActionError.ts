import { HttpError } from "../api/client";
import type { ApiError, EntryCriteriaViolation } from "../api/types";
import { defaultShellChrome, type ShellChrome } from "./i18n/chromeTypes";
import { displayText, displayTextTemplate } from "./i18n/displayText";

type LifecycleEntryCriteriaShell = Pick<
  ShellChrome,
  | "lifecycle_entry_criteria_failure_body"
  | "lifecycle_entry_criteria_failure_footer"
  | "lifecycle_entry_criteria_validate_that"
  | "lifecycle_entry_criteria_no_records_equal"
  | "lifecycle_entry_criteria_record_equals"
  | "lifecycle_entry_criteria_record_not_equals"
  | "lifecycle_entry_criteria_field_is_not_blank"
  | "lifecycle_entry_criteria_failed"
>;

function lifecycleShell(shell: LifecycleEntryCriteriaShell): LifecycleEntryCriteriaShell {
  return {
    lifecycle_entry_criteria_failure_body:
      shell.lifecycle_entry_criteria_failure_body ??
      defaultShellChrome.lifecycle_entry_criteria_failure_body,
    lifecycle_entry_criteria_failure_footer:
      shell.lifecycle_entry_criteria_failure_footer ??
      defaultShellChrome.lifecycle_entry_criteria_failure_footer,
    lifecycle_entry_criteria_validate_that:
      shell.lifecycle_entry_criteria_validate_that ??
      defaultShellChrome.lifecycle_entry_criteria_validate_that,
    lifecycle_entry_criteria_no_records_equal:
      shell.lifecycle_entry_criteria_no_records_equal ??
      defaultShellChrome.lifecycle_entry_criteria_no_records_equal,
    lifecycle_entry_criteria_record_equals:
      shell.lifecycle_entry_criteria_record_equals ??
      defaultShellChrome.lifecycle_entry_criteria_record_equals,
    lifecycle_entry_criteria_record_not_equals:
      shell.lifecycle_entry_criteria_record_not_equals ??
      defaultShellChrome.lifecycle_entry_criteria_record_not_equals,
    lifecycle_entry_criteria_field_is_not_blank:
      shell.lifecycle_entry_criteria_field_is_not_blank ??
      defaultShellChrome.lifecycle_entry_criteria_field_is_not_blank,
    lifecycle_entry_criteria_failed:
      shell.lifecycle_entry_criteria_failed ?? defaultShellChrome.lifecycle_entry_criteria_failed,
  };
}

function formatViolation(violation: EntryCriteriaViolation, shell: LifecycleEntryCriteriaShell): string {
  const labels = lifecycleShell(shell);
  const validateThat = displayText(labels.lifecycle_entry_criteria_validate_that);
  if (violation.kind === "related_record") {
    const related = violation.related_object_label?.trim() || "Related records";
    const state = violation.target_state_label?.trim() || "the required state";
    const method = (violation.method ?? "").toUpperCase();
    if (method === "NONE_EQUALS") {
      const operator = displayText(labels.lifecycle_entry_criteria_no_records_equal);
      return `${validateThat}: ${related}: ${operator} ${state}`;
    }
    if (method === "EQUALS") {
      const operator = displayText(labels.lifecycle_entry_criteria_record_equals);
      return `${validateThat}: ${related}: ${operator} ${state}`;
    }
    if (method === "NOT_EQUALS") {
      const operator = displayText(labels.lifecycle_entry_criteria_record_not_equals);
      return `${validateThat}: ${related}: ${operator} ${state}`;
    }
  }
  if (violation.kind === "field" && violation.constraint === "is_not_blank") {
    const field = violation.field_label?.trim() || "Required field";
    const constraint = displayTextTemplate(labels.lifecycle_entry_criteria_field_is_not_blank, { field });
    return `${validateThat}: ${constraint}`;
  }
  return validateThat;
}

export function formatEntryCriteriaError(body: ApiError, shell: LifecycleEntryCriteriaShell): string {
  const labels = lifecycleShell(shell);
  const targetState = body.target_state_label?.trim() || "the destination state";
  const headerTemplate = displayText(labels.lifecycle_entry_criteria_failure_body);
  const header = displayTextTemplate(labels.lifecycle_entry_criteria_failure_body, { state: targetState }, headerTemplate);
  const violations = (body.violations ?? [])
    .map((violation) => formatViolation(violation, shell))
    .filter(Boolean);
  const footer = displayText(labels.lifecycle_entry_criteria_failure_footer);
  if (violations.length === 0) {
    return [header, footer].join("\n\n");
  }
  return [header, ...violations, footer].join("\n\n");
}

export function isEntryCriteriaError(err: unknown): err is HttpError & { body: ApiError } {
  return err instanceof HttpError && err.body?.error === "entry_criteria_failed";
}

/** Maps lifecycle / converged action HTTP errors to user-facing messages. */
export function resolveActionErrorMessage(
  err: unknown,
  fallback: string,
  shell: LifecycleEntryCriteriaShell = defaultShellChrome,
): string {
  if (err instanceof HttpError) {
    if (err.body?.error === "entry_criteria_failed") {
      return formatEntryCriteriaError(err.body, shell);
    }
    if (err.body?.error === "workflow_not_eligible") {
      return "This workflow step is not supported yet.";
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
