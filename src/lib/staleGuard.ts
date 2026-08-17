import { HttpError } from "../api/client";
import { isEntryCriteriaError, showEntryCriteriaErrorModal } from "./entryCriteriaErrorModal";
import { resolveActionErrorMessage } from "./lifecycleActionError";
import { displayText } from "./i18n/displayText";
import { defaultShellChrome, type ShellChrome } from "./i18n/chromeTypes";

function isStaleError(err: unknown): boolean {
  if (!(err instanceof HttpError)) {
    return false;
  }
  if (err.status === 409) {
    return true;
  }
  const msg = err.message.toLowerCase();
  return msg.includes("stale") || msg.includes("过期");
}

export async function handleStaleError(
  err: unknown,
  reload: () => Promise<void>,
  setMessage: (message: string) => void,
  fallbackMessage: string,
  shell: Pick<
    ShellChrome,
    | "stale_confirm"
    | "stale_reloaded"
    | "lifecycle_entry_criteria_failure_body"
    | "lifecycle_entry_criteria_failure_footer"
    | "lifecycle_entry_criteria_validate_that"
    | "lifecycle_entry_criteria_no_records_equal"
    | "lifecycle_entry_criteria_record_equals"
    | "lifecycle_entry_criteria_record_not_equals"
    | "lifecycle_entry_criteria_field_is_not_blank"
    | "lifecycle_entry_criteria_failed"
    | "confirm"
  > = defaultShellChrome,
): Promise<boolean> {
  if (isEntryCriteriaError(err)) {
    showEntryCriteriaErrorModal(err, shell);
    return false;
  }
  if (!isStaleError(err)) {
    setMessage(resolveActionErrorMessage(err, fallbackMessage, shell));
    return false;
  }
  const reloadOk = window.confirm(displayText(shell.stale_confirm));
  if (reloadOk) {
    await reload();
    setMessage(displayText(shell.stale_reloaded));
    return true;
  }
  setMessage(resolveActionErrorMessage(err, fallbackMessage, shell));
  return true;
}
