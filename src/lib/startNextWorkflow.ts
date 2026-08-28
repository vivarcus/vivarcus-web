import type { StartNextWorkflowResult } from "../api/types";

export function isStartNextPrompt(
  value?: StartNextWorkflowResult | null,
): value is StartNextWorkflowResult {
  return Boolean(value && Array.isArray(value.actions) && value.actions.length > 0);
}
