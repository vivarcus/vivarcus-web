import {
  ClockCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { workflowDueIconClass, type WorkflowDueDateStatus } from "../lib/workflowDueDate";

type Props = {
  dueDate?: string;
  dueDateStatus?: WorkflowDueDateStatus | "due_soon";
  className?: string;
};

/** Veeva-style workflow task due date status indicator. */
export function WorkflowDueDateStatusIcon({ dueDate, dueDateStatus, className }: Props) {
  const tone = workflowDueIconClass(dueDate, dueDateStatus);
  const classes = ["workflow-due-status-icon", tone, className].filter(Boolean).join(" ");

  if (tone === "overdue") {
    return <ExclamationCircleFilled className={classes} aria-hidden />;
  }
  if (tone === "soon") {
    return <ClockCircleFilled className={classes} aria-hidden />;
  }
  return <ClockCircleOutlined className={classes} aria-hidden />;
}
