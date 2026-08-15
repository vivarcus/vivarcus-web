import { Alert, Button, Form, Input, Modal, Radio, Select } from "antd";
import { useMemo, useState } from "react";
import { api, HttpError } from "../api/client";
import type { ActionGuard, RecordPageModel, WorkflowTaskAction } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText, type WorkflowChrome } from "../lib/i18n";
import { handleStaleError } from "../lib/staleGuard";
import {
  collectTaskFieldKeys,
  missingRequiredTaskField,
  selectedVerdictOption,
  taskCompletionFields,
  verdictNeedsSignature,
} from "../lib/workflowTask";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  task: WorkflowTaskAction;
  page: RecordPageModel;
  workflow?: WorkflowChrome;
  onClose: () => void;
  onSuccess: (page: RecordPageModel) => void;
  onError?: (message: string) => void;
  onReloadPage?: () => Promise<void>;
};

function verdictHasComment(opt: { comment_label?: string; comment_required?: boolean }): boolean {
  return Boolean(opt.comment_label?.trim()) || Boolean(opt.comment_required);
}

function actionGuard(page: RecordPageModel): ActionGuard {
  return {
    schema_fingerprint: page.schema_fingerprint,
    ui_fingerprint: page.ui_fingerprint,
    record_version: page.record_version,
  };
}

export function SignatureModal({
  vaultId,
  objectName,
  recordId,
  task,
  page,
  workflow = defaultWorkflowChrome,
  onClose,
  onSuccess,
  onError,
  onReloadPage,
}: Props) {
  const { shell } = useUi();
  const { session } = useAuth();

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

  const [verdictLabel, setVerdictLabel] = useState("");
  const [comment, setComment] = useState(task.completion_draft?.comment ?? "");
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const fieldApiName of collectTaskFieldKeys(task)) {
      const draftValue = task.completion_draft?.fields?.[fieldApiName];
      initial[fieldApiName] = draftValue == null ? "" : String(draftValue);
    }
    return initial;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = selectedVerdictOption(task, verdictLabel);
  const activeFields = taskCompletionFields(task, verdictLabel);
  const needsSignature =
    verdictLabel.trim() !== "" && verdictNeedsSignature(task, verdictLabel);
  const capacities = selected?.capacities ?? [];
  const capacitiesRequired = selected?.capacities_required ?? false;
  const capacitiesLabel =
    selected?.capacities_label ||
    displayText(workflow.signature_role_label, displayText(workflow.signature_capacity_label));
  const taskCommentPrompt = task.task_comments?.[0];
  const verdictCommentPrompt =
    selected && verdictHasComment(selected)
      ? {
          label: selected.comment_label,
          required: selected.comment_required ?? false,
        }
      : null;
  const instructions =
    task.task_instructions?.trim() ||
    displayText(workflow.approve_reject_esign_instructions);
  const showComment = Boolean(taskCommentPrompt || verdictCommentPrompt);
  const commentLabel =
    verdictCommentPrompt?.label ||
    taskCommentPrompt?.label ||
    displayText(workflow.comment_label);
  const commentRequired =
    (verdictCommentPrompt?.required || taskCommentPrompt?.required) ?? false;

  async function finishWithoutSignature(
    resolvedVerdict: string,
    resolvedComment: string,
    resolvedFields: Record<string, string>,
  ) {
    if (!task.workflow_task_id) return;
    const res = await api.workflowComplete(vaultId, objectName, recordId, {
      workflow_task_id: task.workflow_task_id,
      verdict_label: resolvedVerdict,
      comment: resolvedComment,
      fields: resolvedFields,
      action_guard: actionGuard(page),
      layout: page.selected_layout.api_name,
    });
    onSuccess(res.page);
  }

  async function finishWithSignature(
    resolvedVerdict: string,
    resolvedComment: string,
    resolvedFields: Record<string, string>,
  ) {
    if (!task.workflow_task_id) return;
    const signatureMeaning = capacity.trim();
    const challenge = await api.initiateWorkflowSignature(vaultId, objectName, recordId, {
      workflow_task_id: task.workflow_task_id,
      verdict_label: resolvedVerdict,
      comment: resolvedComment,
      fields: resolvedFields,
      action_guard: actionGuard(page),
    });
    const stepUp = await api.authStepUp({
      password,
      scope: {
        kind: "signature",
        record_ref: `${objectName}.${recordId}`,
        workflow_task_id: task.workflow_task_id,
        signature_type: selected?.signature_type ?? task.signature_type,
        vault_id: vaultId,
      },
    });
    const complete = await api.completeSignature(vaultId, {
      challenge_id: challenge.challenge_id,
      step_up_token: stepUp.step_up_token,
      signature_meaning: signatureMeaning || challenge.signature_meaning,
    });
    if (complete.post_hook_failed) {
      throw new Error(displayText(workflow.signature_failed));
    }
    const refreshed = await api.recordPage(
      vaultId,
      objectName,
      recordId,
      { layout: page.selected_layout.api_name },
    );
    onSuccess(refreshed);
  }

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
    if (needsSignature) {
      const expectedUsername = session?.username?.trim() ?? "";
      if (!username.trim()) {
        setError(displayText(workflow.signature_username_required));
        return;
      }
      if (
        expectedUsername &&
        username.trim().toLowerCase() !== expectedUsername.toLowerCase()
      ) {
        setError(displayText(workflow.signature_username_mismatch));
        return;
      }
      if (!password) {
        setError(displayText(workflow.confirm_password));
        return;
      }
      if (capacitiesRequired && !capacity.trim()) {
        setError(displayText(workflow.signature_capacity_required));
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    onError?.("");
    try {
      const resolvedComment = comment.trim();
      if (needsSignature) {
        await finishWithSignature(resolvedVerdict, resolvedComment, fields);
      } else {
        await finishWithoutSignature(resolvedVerdict, resolvedComment, fields);
      }
    } catch (err) {
      const fallback = needsSignature
        ? displayText(workflow.signature_failed)
        : displayText(workflow.complete_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError ?? (() => {}), fallback, shell);
      } else {
        let message = err instanceof Error ? err.message : fallback;
        if (err instanceof HttpError && err.status === 403) {
          message = displayText(workflow.signature_esig_forbidden);
        }
        setError(message);
        onError?.(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      className="approve-reject-modal"
      title={displayText(workflow.approve_or_reject_title)}
      onCancel={onClose}
      footer={
        <div className="approve-reject-modal__footer">
          <span className="approve-reject-modal__required-note">
            {displayText(workflow.required_to_proceed)}
          </span>
          <div className="approve-reject-modal__actions">
            <Button onClick={onClose}>{displayText(shell.cancel)}</Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => void handleSubmit()}
            >
              {displayText(workflow.complete_task)}
            </Button>
          </div>
        </div>
      }
    >
      <p className="approve-reject-modal__intro">{instructions}</p>
      <Form layout="vertical" requiredMark className="approve-reject-form">
        {hasConfiguredVerdicts && (
          <Form.Item label={displayText(workflow.verdict_label)} required>
            <Radio.Group
              className="approve-reject-control"
              value={verdictLabel || undefined}
              onChange={(e) => {
                setVerdictLabel(e.target.value);
                const next = selectedVerdictOption(task, e.target.value);
                setCapacity(next?.capacities?.[0]?.label ?? "");
              }}
            >
              {options.map((opt) => (
                <Radio key={opt.name || opt.label} value={opt.label}>
                  {opt.display_label || opt.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        )}
        {showComment && (
          <Form.Item label={commentLabel} required={commentRequired}>
            <Input.TextArea
              className="approve-reject-control"
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Form.Item>
        )}
        {activeFields.map((field) => (
          <Form.Item
            key={field.field_api_name}
            label={field.field_label || field.field_api_name}
            required={field.required}
          >
            <Input
              className="approve-reject-control"
              value={fields[field.field_api_name] ?? ""}
              onChange={(e) =>
                setFields((current) => ({
                  ...current,
                  [field.field_api_name]: e.target.value,
                }))
              }
            />
          </Form.Item>
        ))}
        {needsSignature && capacities.length > 0 && (
          <Form.Item label={capacitiesLabel} required={capacitiesRequired}>
            <Select
              className="approve-reject-control"
              value={capacity || undefined}
              options={capacities.map((opt) => ({ value: opt.label, label: opt.label }))}
              onChange={setCapacity}
            />
          </Form.Item>
        )}
        {needsSignature && (
          <>
            <Form.Item
              label={displayText(workflow.signature_username_label)}
              required
            >
              <Input
                className="approve-reject-control"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Item>
            <Form.Item label={displayText(workflow.confirm_password)} required>
              <Input.Password
                className="approve-reject-control"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
          </>
        )}
      </Form>
      {error && <Alert type="error" title={error} showIcon role="alert" />}
    </Modal>
  );
}
