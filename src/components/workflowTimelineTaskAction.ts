import type {
  RecordPageModel,
  WorkflowTaskAction,
  WorkflowTimelineInstance,
  WorkflowTimelineTask,
} from "../api/types";

export function enrichTimelineTaskAction(
  inst: WorkflowTimelineInstance,
  task: WorkflowTimelineTask,
  page?: RecordPageModel,
): WorkflowTaskAction {
  const base: WorkflowTaskAction = {
    workflow_instance_id: inst.workflow_instance_id,
    workflow_task_id: task.workflow_task_id,
    workflow_api_name: inst.workflow_api_name,
    workflow_label: inst.workflow_label,
    task_api_name: task.task_api_name,
    task_label: task.task_label,
    status: task.status,
    signature_required: task.signature_required,
    verdict_label: task.verdict_label,
    can_complete: task.actions.can_complete,
    can_cancel: inst.actions.can_cancel_workflow,
  };

  const rich = page?.workflow_tasks?.find(
    (candidate) => candidate.workflow_task_id === task.workflow_task_id,
  );
  if (!rich) {
    return base;
  }

  return {
    ...base,
    ...rich,
    workflow_instance_id: inst.workflow_instance_id,
    workflow_task_id: task.workflow_task_id,
    workflow_api_name: inst.workflow_api_name,
    workflow_label: inst.workflow_label,
    task_api_name: task.task_api_name,
    task_label: task.task_label,
    status: task.status,
    can_complete: task.actions.can_complete ?? rich.can_complete,
  };
}
