import type { WorkflowTimelineTask } from "../api/types";

export function timelineTasksForDisplay(tasks: WorkflowTimelineTask[]): WorkflowTimelineTask[] {
  const sortKey = (task: WorkflowTimelineTask) => task.completed_at || task.created_at || "";
  return [...tasks].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}
