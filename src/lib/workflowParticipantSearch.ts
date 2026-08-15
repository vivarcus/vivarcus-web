import type { WorkflowStartDialogControl } from "../api/types";

export function workflowParticipantSearchRoles(control: WorkflowStartDialogControl) {
  return {
    constrain_roles: control.constrain_role_api_names,
    exclude_roles: control.exclude_role_api_names,
    constrain_roles_not_allowed: control.constrain_roles_not_allowed_api_names,
  };
}
