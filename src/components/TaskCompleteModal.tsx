import { Button, Form, Input, Modal, Radio } from "antd";
import { useMemo, useState } from "react";
import type { WorkflowContentVerdict, WorkflowTaskAction, WorkflowVerdictOption } from "../api/types";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText, type WorkflowChrome } from "../lib/i18n";
import {
  anyContentCommentRequired,
  anyContentShowsComment,
  anyContentVerdictNeedsSignature,
  collectedContentVerdicts,
  collectTaskFieldKeys,
  initialContentVerdictLabels,
  missingContentVerdictLabel,
  missingRequiredTaskField,
  selectedVerdictOption,
  sharedContentVerdictLabel,
  taskCompletionFields,
  taskCompletionFieldsForContents,
  usesMultipleVerdicts,
  verdictNeedsSignature,
} from "../lib/workflowTask";
import { parseSoDExhausted } from "../lib/workflowSoD";

type Props = {
  task: WorkflowTaskAction;
  workflow?: WorkflowChrome;
  onClose: () => void;
  onSubmit: (
    verdictLabel: string,
    comment: string,
    fields: Record<string, string>,
    contentVerdicts?: WorkflowContentVerdict[],
  ) => Promise<void>;
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
  const multiple = usesMultipleVerdicts(task);

  const [verdictLabel, setVerdictLabel] = useState(() => defaultVerdictLabel(task));
  const [contentVerdicts, setContentVerdicts] = useState<Record<string, string>>(() =>
    initialContentVerdictLabels(task),
  );
  const [comment, setComment] = useState(task.completion_draft?.comment ?? "");
  const [fields, setFields] = useState<Record<string, string>>(() => initialTaskFields(task));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = selectedVerdictOption(task, multiple ? sharedContentVerdictLabel(contentVerdicts) : verdictLabel);
  const activeFields = multiple
    ? taskCompletionFieldsForContents(task, contentVerdicts)
    : taskCompletionFields(task, verdictLabel);
  const needsSignature = multiple
    ? anyContentVerdictNeedsSignature(task, contentVerdicts)
    : verdictNeedsSignature(task, verdictLabel);
  const taskCommentPrompt = task.task_comments?.[0];
  const verdictCommentPrompt =
    selected && verdictHasComment(selected)
      ? {
          label: selected.comment_label,
          required: selected.comment_required ?? false,
        }
      : null;
  const instructions = task.task_instructions?.trim() ?? "";
  const showComment = multiple
    ? Boolean(taskCommentPrompt || anyContentShowsComment(task, contentVerdicts))
    : Boolean(taskCommentPrompt || verdictCommentPrompt);
  const commentLabel =
    verdictCommentPrompt?.label ||
    taskCommentPrompt?.label ||
    displayText(workflow.comment_label);
  const commentRequired = multiple
    ? Boolean(taskCommentPrompt?.required || anyContentCommentRequired(task, contentVerdicts))
    : Boolean((verdictCommentPrompt?.required || taskCommentPrompt?.required) ?? false);

  async function handleSubmit() {
    if (multiple) {
      if (hasConfiguredVerdicts) {
        const missing = missingContentVerdictLabel(task, contentVerdicts);
        if (missing) {
          setError(displayText(workflow.verdict_required));
          return;
        }
      }
    } else if (hasConfiguredVerdicts && !verdictLabel.trim()) {
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
      if (multiple) {
        await onSubmit(
          sharedContentVerdictLabel(contentVerdicts),
          comment.trim(),
          fields,
          collectedContentVerdicts(task, contentVerdicts, comment),
        );
      } else {
        await onSubmit(verdictLabel.trim(), comment.trim(), fields);
      }
    } catch (err) {
      const exhausted = parseSoDExhausted(err);
      if (exhausted) {
        const hint = displayText(workflow.sod_exhausted_hint);
        setError(hint ? `${exhausted.message} ${hint}` : exhausted.message);
      } else {
        setError(err instanceof Error ? err.message : displayText(workflow.complete_failed));
      }
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
      {hasConfiguredVerdicts && multiple && (
        <Form layout="vertical">
          {(task.contents ?? []).map((content) => (
            <Form.Item
              key={content.record_id}
              className="workflow-task__content-item"
              label={content.name?.trim() || content.record_id}
              required
            >
              <Radio.Group
                value={contentVerdicts[content.record_id] ?? ""}
                onChange={(e) =>
                  setContentVerdicts((current) => ({
                    ...current,
                    [content.record_id]: e.target.value,
                  }))
                }
              >
                {options.map((opt) => (
                  <Radio key={`${content.record_id}-${opt.name || opt.label}`} value={opt.label}>
                    {opt.display_label || opt.label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          ))}
        </Form>
      )}
      {hasConfiguredVerdicts && !multiple && (
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
