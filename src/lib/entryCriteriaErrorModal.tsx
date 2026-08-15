import { Modal } from "antd";
import type { ApiError } from "../api/types";
import { defaultShellChrome, type ShellChrome } from "./i18n/chromeTypes";
import { displayText } from "./i18n/displayText";
import { formatEntryCriteriaError, isEntryCriteriaError } from "./lifecycleActionError";

type EntryCriteriaModalShell = Pick<
  ShellChrome,
  | "lifecycle_entry_criteria_failure_body"
  | "lifecycle_entry_criteria_failure_footer"
  | "lifecycle_entry_criteria_validate_that"
  | "lifecycle_entry_criteria_no_records_equal"
  | "lifecycle_entry_criteria_record_equals"
  | "lifecycle_entry_criteria_record_not_equals"
  | "lifecycle_entry_criteria_field_is_not_blank"
  | "lifecycle_entry_criteria_failed"
  | "confirm"
>;

/** Shows Veeva-style entry criteria failure modal when applicable. */
export function showEntryCriteriaErrorModal(
  err: unknown,
  shell: EntryCriteriaModalShell = defaultShellChrome,
): boolean {
  if (!isEntryCriteriaError(err)) {
    return false;
  }
  const message = formatEntryCriteriaError(err.body as ApiError, shell);
  Modal.error({
    title: displayText(shell.lifecycle_entry_criteria_failed),
    content: <div style={{ whiteSpace: "pre-line" }}>{message}</div>,
    okText: displayText(shell.confirm),
  });
  return true;
}

export { isEntryCriteriaError };
