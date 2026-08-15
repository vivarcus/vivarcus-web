import { displayText, type WorkflowChrome } from "./i18n";

export type WorkflowDueDateStatus = "overdue" | "coming_soon" | "on_track" | "";
export type WorkflowDueTone = "overdue" | "soon" | "on_track" | "none";

function resolveDueStatus(
  dueDate?: string,
  dueDateStatus?: WorkflowDueDateStatus | "due_soon",
): WorkflowDueDateStatus | "due_soon" | "" {
  if (dueDateStatus === "due_soon") {
    return "due_soon";
  }
  if (dueDateStatus) {
    return dueDateStatus;
  }
  if (dueDate?.trim()) {
    return computeDueDateStatus(dueDate);
  }
  return "";
}

/** CSS tone for banners, labels, and icons (overdue / soon / on_track / none). */
export function workflowDueTone(
  dueDate?: string,
  dueDateStatus?: WorkflowDueDateStatus | "due_soon",
): WorkflowDueTone {
  const status = resolveDueStatus(dueDate, dueDateStatus);
  if (status === "overdue") {
    return "overdue";
  }
  if (status === "coming_soon" || status === "due_soon") {
    return "soon";
  }
  if (dueDate?.trim()) {
    return "on_track";
  }
  return "none";
}

/** Icon color bucket (ok = on_track or none). */
export function workflowDueIconClass(
  dueDate?: string,
  dueDateStatus?: WorkflowDueDateStatus | "due_soon",
) {
  const tone = workflowDueTone(dueDate, dueDateStatus);
  if (tone === "overdue") {
    return "overdue";
  }
  if (tone === "soon") {
    return "soon";
  }
  return "ok";
}

export function computeDueDateStatus(
  dueDate: string,
  taskStatus?: string,
): WorkflowDueDateStatus {
  const status = (taskStatus ?? "").toLowerCase();
  if (status === "completed" || status === "cancelled" || status === "rejected") {
    return "";
  }
  const parts = dueDate.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return "";
  }
  const [year, month, day] = parts;
  const due = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (due < today) {
    return "overdue";
  }
  const weekAhead = today + 7 * 24 * 60 * 60 * 1000;
  if (due <= weekAhead) {
    return "coming_soon";
  }
  return "on_track";
}

function dueDateStatusLabel(status?: string, workflow?: WorkflowChrome) {
  switch (status) {
    case "overdue":
      return workflow ? displayText(workflow.due_overdue) : "Overdue";
    case "coming_soon":
    case "due_soon":
      return workflow ? displayText(workflow.due_coming_soon) : "Due soon";
    case "on_track":
      return workflow ? displayText(workflow.due_on_track) : "On track";
    default:
      return "";
  }
}

export function formatWorkflowDueDateLabel(
  dueDate?: string,
  status?: string,
  workflow?: WorkflowChrome,
): string | null {
  if (!dueDate?.trim()) {
    return null;
  }
  const statusLabel = dueDateStatusLabel(status, workflow);
  const prefix = workflow ? `${displayText(workflow.timeline_due)}: ` : "Due: ";
  return statusLabel ? `${prefix}${dueDate} (${statusLabel})` : `${prefix}${dueDate}`;
}
