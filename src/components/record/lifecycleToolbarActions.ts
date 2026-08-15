import type { LifecycleAction } from "../../api/types";

export type LifecycleActionKind = "start_workflow" | "change_state" | "other";

export function resolveLifecycleActionKind(action: LifecycleAction): LifecycleActionKind {
  if (action.kind === "start_workflow" || action.kind === "change_state") {
    return action.kind;
  }
  if (action.kind === "object_action" || action.kind === "application_action") {
    return "other";
  }
  if (action.workflow_start_dialog) {
    return "start_workflow";
  }
  return "other";
}

export function partitionLifecycleToolbarActions(actions: LifecycleAction[]) {
  const startWorkflow: LifecycleAction[] = [];
  const changeState: LifecycleAction[] = [];
  const allActionsMenu: LifecycleAction[] = [];
  const sorted = [...actions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const action of sorted) {
    const kind = resolveLifecycleActionKind(action);
    // Veeva routes displayInAllActionsMenu actions only to All Actions, not Workflow/State Change.
    if (action.display_in_all_actions_menu) {
      allActionsMenu.push(action);
      continue;
    }
    if (kind === "start_workflow") {
      startWorkflow.push(action);
    } else if (kind === "change_state") {
      changeState.push(action);
    } else {
      allActionsMenu.push(action);
    }
  }

  return { startWorkflow, changeState, allActionsMenu };
}
