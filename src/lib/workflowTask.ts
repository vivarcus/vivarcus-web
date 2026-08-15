import type { WorkflowTaskAction, WorkflowVerdictOption } from "../api/types";

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
  return selected?.signature_required ?? task.signature_required ?? false;
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
