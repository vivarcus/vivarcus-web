import type { DisplayText, LifecycleChevron } from "../api/types";
import { displayText } from "./i18n";

type HeaderStateSource = {
  state_label?: DisplayText;
  state_api_name?: string | null;
  lifecycle_chevron?: Pick<LifecycleChevron, "stages"> | null;
};

/** Header status badge uses the lifecycle state, not the current chevron stage.
 * Document Review / QC / Approval share the "In Review" stage group. */
export function recordHeaderStateLabel(page: HeaderStateSource | null | undefined): DisplayText | undefined {
  if (!page) {
    return undefined;
  }
  if (displayText(page.state_label).trim()) {
    return page.state_label;
  }
  const apiName = (page.state_api_name ?? "").trim();
  if (apiName) {
    return { text: apiName };
  }
  return page.lifecycle_chevron?.stages?.find((stage) => stage.current)?.label;
}
