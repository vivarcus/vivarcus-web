import type {
  TaskDashboardTaskItem,
  WorkflowContentVerdict,
  WorkflowTaskAction,
  WorkflowVerdictOption,
} from "../api/types";

export const MAX_WORKFLOW_ENVELOPE_RECORDS = 100;

export type TaskCompletionField = {
  field_api_name: string;
  field_label?: string;
  required?: boolean;
};

export function selectedVerdictOption(
  task: WorkflowTaskAction,
  verdictLabel: string,
): WorkflowVerdictOption | undefined {
  const label = verdictLabel.trim();
  return task.verdict_options?.find(
    (opt) => opt.label === label || opt.name === label,
  );
}

export function taskHasSignatureRequirement(task: WorkflowTaskAction): boolean {
  if (task.signature_required) {
    return true;
  }
  return (task.verdict_options ?? []).some((opt) => opt.signature_required);
}

export function verdictNeedsSignature(
  task: WorkflowTaskAction,
  verdictLabel: string,
): boolean {
  const selected = selectedVerdictOption(task, verdictLabel);
  // Verdict-level eSignature applies only to verdicts that carry the flag;
  // a matching verdict without it must not inherit the task-level requirement
  // (task-level eSig is stored as a flag on every verdict by the backend).
  if (selected) {
    return selected.signature_required === true;
  }
  return task.signature_required === true;
}

export function taskCompletionFields(
  task: WorkflowTaskAction,
  verdictLabel: string,
): TaskCompletionField[] {
  const fields: TaskCompletionField[] = [];
  const seen = new Set<string>();

  for (const field of task.task_fields ?? []) {
    if (!field.field_api_name || seen.has(field.field_api_name)) {
      continue;
    }
    seen.add(field.field_api_name);
    fields.push({
      field_api_name: field.field_api_name,
      field_label: field.field_label,
      required: field.required,
    });
  }

  const selected = selectedVerdictOption(task, verdictLabel);
  if (selected?.field_api_name && !seen.has(selected.field_api_name)) {
    fields.push({
      field_api_name: selected.field_api_name,
      field_label: selected.field_label,
      required: selected.field_required,
    });
  }

  return fields;
}

export function usesMultipleVerdicts(task: WorkflowTaskAction): boolean {
  return Boolean(task.multiple_verdicts && (task.contents?.length ?? 0) > 0);
}

export function initialContentVerdictLabels(task: WorkflowTaskAction): Record<string, string> {
  const out: Record<string, string> = {};
  const draftByRecord = new Map(
    (task.completion_draft?.content_verdicts ?? []).map((item) => [
      item.record_id,
      item.verdict_label?.trim() ?? "",
    ]),
  );
  for (const content of task.contents ?? []) {
    out[content.record_id] =
      draftByRecord.get(content.record_id) || content.verdict_label?.trim() || "";
  }
  return out;
}

export function collectedContentVerdicts(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
  comment: string,
): WorkflowContentVerdict[] {
  const trimmedComment = comment.trim();
  return (task.contents ?? []).map((content) => ({
    record_id: content.record_id,
    verdict_label: (byRecord[content.record_id] ?? "").trim(),
    ...(trimmedComment ? { comment: trimmedComment } : {}),
  }));
}

export function missingContentVerdictLabel(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): string | null {
  for (const content of task.contents ?? []) {
    if (!(byRecord[content.record_id] ?? "").trim()) {
      return content.name?.trim() || content.record_id;
    }
  }
  return null;
}

export function sharedContentVerdictLabel(byRecord: Record<string, string>): string {
  const labels = Object.values(byRecord)
    .map((value) => value.trim())
    .filter(Boolean);
  if (labels.length === 0) {
    return "";
  }
  const first = labels[0];
  return labels.every((label) => label === first) ? first : first;
}

export function anyContentVerdictNeedsSignature(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): boolean {
  return (task.contents ?? []).some((content) =>
    verdictNeedsSignature(task, byRecord[content.record_id] ?? ""),
  );
}

export function anyContentCommentRequired(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): boolean {
  return (task.contents ?? []).some((content) => {
    const selected = selectedVerdictOption(task, byRecord[content.record_id] ?? "");
    return Boolean(selected?.comment_required);
  });
}

export function anyContentShowsComment(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): boolean {
  return (task.contents ?? []).some((content) => {
    const selected = selectedVerdictOption(task, byRecord[content.record_id] ?? "");
    return Boolean(selected?.comment_label?.trim() || selected?.comment_required);
  });
}

export function signatureVerdictOption(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): WorkflowVerdictOption | undefined {
  for (const content of task.contents ?? []) {
    const selected = selectedVerdictOption(task, byRecord[content.record_id] ?? "");
    if (selected?.signature_required) {
      return selected;
    }
  }
  return selectedVerdictOption(task, sharedContentVerdictLabel(byRecord));
}

export function taskCompletionFieldsForContents(
  task: WorkflowTaskAction,
  byRecord: Record<string, string>,
): TaskCompletionField[] {
  const fields: TaskCompletionField[] = [];
  const seen = new Set<string>();
  for (const field of task.task_fields ?? []) {
    if (!field.field_api_name || seen.has(field.field_api_name)) {
      continue;
    }
    seen.add(field.field_api_name);
    fields.push({
      field_api_name: field.field_api_name,
      field_label: field.field_label,
      required: field.required,
    });
  }
  for (const content of task.contents ?? []) {
    const selected = selectedVerdictOption(task, byRecord[content.record_id] ?? "");
    if (selected?.field_api_name && !seen.has(selected.field_api_name)) {
      seen.add(selected.field_api_name);
      fields.push({
        field_api_name: selected.field_api_name,
        field_label: selected.field_label,
        required: selected.field_required,
      });
    }
  }
  return fields;
}

export function missingRequiredTaskField(
  fields: TaskCompletionField[],
  values: Record<string, string>,
): string | null {
  for (const field of fields) {
    if (field.required && !values[field.field_api_name]?.trim()) {
      return field.field_label?.trim() || field.field_api_name;
    }
  }
  return null;
}

export function collectTaskFieldKeys(task: WorkflowTaskAction): string[] {
  const keys = new Set<string>();
  for (const field of task.task_fields ?? []) {
    if (field.field_api_name) {
      keys.add(field.field_api_name);
    }
  }
  for (const option of task.verdict_options ?? []) {
    if (option.field_api_name) {
      keys.add(option.field_api_name);
    }
  }
  return [...keys];
}

export function workflowTaskActionFromDashboard(
  task: TaskDashboardTaskItem,
): WorkflowTaskAction | null {
  if (!task.can_complete || !task.workflow_task_id || !task.completion) {
    return null;
  }
  return {
    ...task.completion,
    workflow_task_id: task.workflow_task_id,
    can_complete: true,
  };
}
