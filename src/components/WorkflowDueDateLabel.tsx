import {
  computeDueDateStatus,
  formatWorkflowDueDateLabel,
  workflowDueTone,
  type WorkflowDueDateStatus,
} from "../lib/workflowDueDate";
import type { WorkflowChrome } from "../lib/i18n";

type Props = {
  dueDate?: string;
  dueDateStatus?: WorkflowDueDateStatus | "due_soon";
  workflow?: WorkflowChrome;
  className?: string;
};

export function WorkflowDueDateLabel({
  dueDate,
  dueDateStatus,
  workflow,
  className,
}: Props) {
  if (!dueDate?.trim()) {
    return null;
  }
  const status =
    dueDateStatus || computeDueDateStatus(dueDate) || undefined;
  const label = formatWorkflowDueDateLabel(dueDate, status, workflow);
  if (!label) {
    return null;
  }
  const tone = workflowDueTone(dueDate, dueDateStatus);
  const classes = ["workflow-due-label", `workflow-due-label--${tone}`, className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{label}</span>;
}
