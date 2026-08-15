import { Button, Form, Input, Modal, Radio } from "antd";
import { useMemo, useState } from "react";
import type { WorkflowTaskAction, WorkflowVerdictOption } from "../api/types";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText, type WorkflowChrome } from "../lib/i18n";
import {
  collectTaskFieldKeys,
  missingRequiredTaskField,
  selectedVerdictOption,
  taskCompletionFields,
} from "../lib/workflowTask";

type Props = {
  task: WorkflowTaskAction;
  workflow?: WorkflowChrome;
  onClose: () => void;
  onSubmit: (verdictLabel: string, comment: string, fields: Record<string, string>) => Promise<void>;
};

function verdictHasComment(opt: WorkflowVerdictOption): boolean {
  return Boolean(opt.comment_label?.trim()) || Boolean(opt.comment_required);
}

function defaultVerdictLabel(task: WorkflowTaskAction): string {
  return task.completion_draft?.verdict_label?.trim() ?? "";
}

function initialTaskFields(task: WorkflowTaskAction): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const fieldApiName of collectTaskFieldKeys(task)) {
    const draftValue = task.completion_draft?.fields?.[fieldApiName];
    initial[fieldApiName] = draftValue == null ? "" : String(draftValue);
  }
  return initial;
}

export function TaskCompleteModal({ task, workflow = defaultWorkflowChrome, onClose, onSubmit }: Props) {
  const { shell } = useUi();
  const options = useMemo(() => {
    if (task.verdict_options && task.verdict_options.length > 0) {
      return task.verdict_options;
    }
    if (task.verdict_label) {
      return [{ name: task.verdict_label, label: task.verdict_label }];
    }
    return [{ name: "complete", label: displayText(workflow.complete_task_fallback) }];
  }, [task, workflow]);

  const hasConfiguredVerdicts = (task.verdict_options?.length ?? 0) > 0;

  const [verdictLabel, setVerdictLabel] = useState(() => defaultVerdictLabel(task));
  const [comment, setComment] = useState(task.completion_draft?.comment ?? "");
  const [fields, setFields] = useState<Record<string, string>>(() => initialTaskFields(task));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = selectedVerdictOption(task, verdictLabel);
  const activeFields = taskCompletionFields(task, verdictLabel);
  const needsSignature = selected?.signature_required ?? task.signature_required;
  const taskCommentPrompt = task.task_comments?.[0];
  const verdictCommentPrompt =
    selected && verdictHasComment(selected)
      ? {
          label: selected.comment_label,
          required: selected.comment_required ?? false,
        }
      : null;
  const instructions = task.task_instructions?.trim() ?? "";
  const showComment = Boolean(taskCommentPrompt || verdictCommentPrompt);
  const commentLabel =
    verdictCommentPrompt?.label ||
    taskCommentPrompt?.label ||
    displayText(workflow.comment_label);
  const commentRequired =
    (verdictCommentPrompt?.required || taskCommentPrompt?.required) ?? false;

  async function handleSubmit() {
    const resolvedVerdict = verdictLabel.trim();
    if (hasConfiguredVerdicts && !resolvedVerdict) {
      setError(displayText(workflow.verdict_required));
      return;
    }
    if (commentRequired && !comment.trim()) {
      setError(displayText(workflow.comment_required));
      return;
    }
    const missingField = missingRequiredTaskField(activeFields, fields);
    if (missingField) {
      setError(`${missingField} is required`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(resolvedVerdict, comment.trim(), fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(workflow.complete_failed));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      title={task.task_label ?? displayText(workflow.task_fallback)}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {displayText(shell.cancel)}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={() => void handleSubmit()}
        >
          {needsSignature
            ? displayText(workflow.continue_to_signature)
            : displayText(workflow.complete_task)}
        </Button>,
      ]}
    >
      {instructions && (
        <p className="workflow-task__instructions">
          <span className="workflow-task__instructions-label">
            {displayText(workflow.instructions_label)}
          </span>
          {instructions}
        </p>
      )}
      {hasConfiguredVerdicts && (
        <Form layout="vertical">
          <Form.Item label={displayText(workflow.verdict_label)} required>
            <Radio.Group value={verdictLabel} onChange={(e) => setVerdictLabel(e.target.value)}>
              {options.map((opt) => (
                <Radio key={opt.name || opt.label} value={opt.label}>
                  {opt.display_label || opt.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      )}
      {showComment && (
        <Form layout="vertical">
          <Form.Item label={commentLabel} required={commentRequired}>
            <Input.TextArea
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Form.Item>
        </Form>
      )}
      {activeFields.map((field) => (
        <Form layout="vertical" key={field.field_api_name}>
          <Form.Item
            label={field.field_label || field.field_api_name}
            required={field.required}
          >
            <Input
              value={fields[field.field_api_name] ?? ""}
              onChange={(e) =>
                setFields((current) => ({
                  ...current,
                  [field.field_api_name]: e.target.value,
                }))
              }
            />
          </Form.Item>
        </Form>
      ))}
      {error && <p className="workflow-task__error">{error}</p>}
    </Modal>
  );
}
