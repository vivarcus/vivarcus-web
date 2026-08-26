import { Button, Checkbox, Form, Input, Modal, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type {
  ActionGuard,
  RecordPageModel,
  WorkflowStartDialogControl,
  WorkflowTimelineInstance,
  WorkflowTimelineTask,
} from "../api/types";
import { useUi } from "../context/UiContext";
import {
  defaultWorkflowChrome,
  displayText,
  type WorkflowChrome,
} from "../lib/i18n";
import { resolveActionErrorMessage } from "../lib/lifecycleActionError";
import { handleStaleError, isStaleError } from "../lib/staleGuard";
import { workflowControlFieldName } from "../lib/workflowStartField";
import { DateFieldInput } from "../renderers/DateFieldInput";
import { WorkflowParticipantControl } from "./WorkflowParticipantControl";
import { WorkflowUserSelect } from "./WorkflowUserSelect";

export type TimelineAdminModalState =
  | { kind: "cancel-workflow"; instance: WorkflowTimelineInstance }
  | { kind: "cancel-task"; instance: WorkflowTimelineInstance; task: WorkflowTimelineTask }
  | { kind: "reassign-task"; instance: WorkflowTimelineInstance; task: WorkflowTimelineTask }
  | { kind: "replace-owner"; instance: WorkflowTimelineInstance }
  | { kind: "add-participants"; instance: WorkflowTimelineInstance }
  | { kind: "email-participants"; instance: WorkflowTimelineInstance }
  | { kind: "update-workflow-due"; instance: WorkflowTimelineInstance }
  | { kind: "update-task-due"; instance: WorkflowTimelineInstance; task: WorkflowTimelineTask };

type Props = {
  state: TimelineAdminModalState | null;
  onClose: () => void;
  vaultId: string;
  objectName: string;
  recordId: string;
  page: RecordPageModel;
  workflow?: WorkflowChrome;
  onPageUpdate: (page: RecordPageModel) => void;
  onError: (message: string) => void;
  onReloadPage?: () => Promise<void>;
};

function actionGuard(page: RecordPageModel): ActionGuard {
  return {
    schema_fingerprint: page.schema_fingerprint,
    ui_fingerprint: page.ui_fingerprint,
    record_version: page.record_version,
  };
}

const EMAIL_AUDIENCE_OPTIONS = [
  { value: "available", label: "Available task owners" },
  { value: "completed", label: "Completed task owners" },
  { value: "incomplete", label: "Incomplete task owners" },
] as const;

function existingMembersByGroup(
  groups: Array<{ group_name: string; members: Array<{ user_id: string }> }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const group of groups) {
    out[group.group_name] = group.members.map((member) => member.user_id).filter(Boolean);
  }
  return out;
}

function isAddableParticipantGroup(groupName: string, strategy?: string): boolean {
  const name = groupName.trim();
  if (!name || name === "workflow_initiator__v" || name === "workflow_owner__v") {
    return false;
  }
  switch ((strategy ?? "").trim()) {
    case "workflow_initiator":
    case "task_owner":
    case "custom_action":
      return false;
    default:
      return true;
  }
}

function addableParticipantControls(controls: WorkflowStartDialogControl[]): WorkflowStartDialogControl[] {
  return controls.filter(
    (control) =>
      control.type === "participant" &&
      isAddableParticipantGroup(control.participant_name ?? "", control.participant_strategy),
  );
}

function newParticipantSelections(
  controls: WorkflowStartDialogControl[],
  values: Record<string, string[]>,
  existing: Record<string, string[]>,
): Array<{ group: string; userIDs: string[] }> {
  const out: Array<{ group: string; userIDs: string[] }> = [];
  for (const control of controls) {
    const group = control.participant_name?.trim();
    if (!group) {
      continue;
    }
    const locked = new Set(existing[group] ?? []);
    const selected = values[group] ?? [];
    const userIDs = selected.filter((id) => id.trim() !== "" && !locked.has(id));
    if (userIDs.length > 0) {
      out.push({ group, userIDs });
    }
  }
  return out;
}

export function WorkflowTimelineActionModals({
  state,
  onClose,
  vaultId,
  objectName,
  recordId,
  page,
  workflow: workflowProp,
  onPageUpdate,
  onError,
  onReloadPage,
}: Props) {
  const { shell, displayContext } = useUi();
  const workflow = { ...defaultWorkflowChrome, ...workflowProp };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [assigneeUserID, setAssigneeUserID] = useState("");
  const [newOwnerUserID, setNewOwnerUserID] = useState("");
  const [participantControls, setParticipantControls] = useState<WorkflowStartDialogControl[]>([]);
  const [existingParticipantIDs, setExistingParticipantIDs] = useState<Record<string, string[]>>({});
  const [participantValues, setParticipantValues] = useState<Record<string, string[]>>({});
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [emailAudience, setEmailAudience] = useState<string>("available");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailCcSelf, setEmailCcSelf] = useState(true);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!state) {
      return;
    }
    setError(null);
    setSubmitting(false);
    setCancelReason("");
    setCancelComment("");
    setAssigneeUserID("");
    setNewOwnerUserID("");
    setParticipantControls([]);
    setExistingParticipantIDs({});
    setParticipantValues({});
    setParticipantsLoading(false);
    setEmailAudience("available");
    setEmailMessage("");
    setEmailCcSelf(true);

    if (state.kind === "update-workflow-due") {
      setDueDate(state.instance.due_date ?? "");
    } else if (state.kind === "update-task-due") {
      setDueDate(state.task.due_date ?? "");
    } else {
      setDueDate("");
    }

    if (state.kind === "add-participants") {
      setParticipantsLoading(true);
      void (async () => {
        try {
          const res = await api.workflowParticipants(
            vaultId,
            objectName,
            recordId,
            state.instance.workflow_instance_id,
          );
          const existing = existingMembersByGroup(res.groups);
          const controls = addableParticipantControls(res.participant_controls ?? []);
          setParticipantControls(controls);
          setExistingParticipantIDs(existing);
          setParticipantValues(existing);
        } catch (err) {
          setParticipantControls([]);
          setExistingParticipantIDs({});
          setParticipantValues({});
          setError(err instanceof Error ? err.message : "Failed to load participants");
        } finally {
          setParticipantsLoading(false);
        }
      })();
    }
  }, [state, vaultId, objectName, recordId]);

  const pendingParticipantAdds = useMemo(
    () => newParticipantSelections(participantControls, participantValues, existingParticipantIDs),
    [existingParticipantIDs, participantControls, participantValues],
  );

  if (!state) {
    return null;
  }

  async function runMutation(action: () => Promise<{ page: RecordPageModel }>, fallback: string) {
    setSubmitting(true);
    setError(null);
    onError("");
    try {
      const res = await action();
      onPageUpdate(res.page);
      onClose();
    } catch (err) {
      if (onReloadPage && isStaleError(err)) {
        await handleStaleError(err, onReloadPage, onError, fallback, shell);
        onClose();
        return;
      }
      setError(resolveActionErrorMessage(err, fallback, shell));
    } finally {
      setSubmitting(false);
    }
  }

  const layout = page.selected_layout.api_name;
  const guard = actionGuard(page);

  function footer(submitLabel: string, onSubmit: () => void, disableSubmit = false) {
    return [
      <Button key="cancel" onClick={onClose}>
        {displayText(shell.cancel)}
      </Button>,
      <Button
        key="submit"
        type="primary"
        loading={submitting}
        disabled={disableSubmit}
        onClick={() => void onSubmit()}
      >
        {submitLabel}
      </Button>,
    ];
  }

  if (state.kind === "cancel-workflow") {
    return (
      <Modal
        open
        title={displayText(workflow.cancel_workflow)}
        onCancel={onClose}
        footer={footer(displayText(workflow.cancel_workflow), () => {
          const reason = cancelReason.trim();
          if (!reason) {
            setError(displayText(workflow.cancel_reason_prompt));
            return;
          }
          void runMutation(
            () =>
              api.workflowCancel(vaultId, objectName, recordId, {
                workflow_instance_id: state.instance.workflow_instance_id,
                reason,
                comment: cancelComment.trim() || undefined,
                action_guard: guard,
                layout,
              }),
            displayText(workflow.cancel_failed),
          );
        }, !cancelReason.trim())}
      >
        <Form layout="vertical">
          <Form.Item label={displayText(workflow.cancel_reason_prompt)} required>
            <Input
              value={cancelReason}
              placeholder="user_cancelled"
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={displayText(workflow.comment_label)}>
            <Input.TextArea
              rows={3}
              maxLength={500}
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
            />
          </Form.Item>
        </Form>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "cancel-task") {
    return (
      <Modal
        open
        title={displayText(workflow.timeline_cancel_task)}
        onCancel={onClose}
        footer={footer(displayText(shell.confirm), () => {
          void runMutation(
            () =>
              api.workflowCancelTask(vaultId, objectName, recordId, {
                workflow_task_id: state.task.workflow_task_id,
                action_guard: guard,
                layout,
              }),
            displayText(workflow.cancel_failed),
          );
        })}
      >
        <p>
          {displayText(workflow.timeline_cancel_task)}:{" "}
          <strong>{state.task.task_label || state.task.task_api_name}</strong>
        </p>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "reassign-task") {
    return (
      <Modal
        open
        title={displayText(workflow.timeline_reassign_task)}
        onCancel={onClose}
        footer={footer(displayText(workflow.timeline_reassign_task), () => {
          if (!assigneeUserID.trim()) {
            setError("Select a user");
            return;
          }
          void runMutation(
            () =>
              api.workflowReassignTask(vaultId, objectName, recordId, {
                workflow_task_id: state.task.workflow_task_id,
                assignee_user_id: assigneeUserID.trim(),
                action_guard: guard,
                layout,
              }),
            displayText(workflow.cancel_failed),
          );
        }, !assigneeUserID.trim())}
      >
        <Form layout="vertical">
          <Form.Item label={displayText(workflow.timeline_reassign_task)} required>
            <WorkflowUserSelect
              vaultId={vaultId}
              objectName={objectName}
              recordId={recordId}
              value={assigneeUserID}
              onChange={(next) => setAssigneeUserID(typeof next === "string" ? next : "")}
            />
          </Form.Item>
        </Form>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "replace-owner") {
    return (
      <Modal
        open
        title={displayText(workflow.timeline_replace_owner)}
        onCancel={onClose}
        footer={footer(displayText(workflow.timeline_replace_owner), () => {
          if (!newOwnerUserID.trim()) {
            setError("Select a user");
            return;
          }
          void runMutation(
            () =>
              api.workflowReplaceOwner(vaultId, objectName, recordId, {
                workflow_instance_id: state.instance.workflow_instance_id,
                new_owner_user_id: newOwnerUserID.trim(),
                action_guard: guard,
                layout,
              }),
            displayText(workflow.cancel_failed),
          );
        }, !newOwnerUserID.trim())}
      >
        <Form layout="vertical">
          <Form.Item label={displayText(workflow.timeline_replace_owner)} required>
            <WorkflowUserSelect
              vaultId={vaultId}
              objectName={objectName}
              recordId={recordId}
              value={newOwnerUserID}
              onChange={(next) => setNewOwnerUserID(typeof next === "string" ? next : "")}
            />
          </Form.Item>
        </Form>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "add-participants") {
    return (
      <Modal
        open
        title={displayText(workflow.timeline_add_participants)}
        className="workflow-start-modal"
        width={532}
        onCancel={onClose}
        footer={footer(
          displayText(workflow.timeline_add_participants),
          () => {
            if (pendingParticipantAdds.length === 0) {
              setError("Select at least one new user");
              return;
            }
            void runMutation(async () => {
              let nextPage = page;
              for (const selection of pendingParticipantAdds) {
                const res = await api.workflowAddParticipants(vaultId, objectName, recordId, {
                  workflow_instance_id: state.instance.workflow_instance_id,
                  participant_group: selection.group,
                  user_ids: selection.userIDs,
                  action_guard: guard,
                  layout,
                });
                nextPage = res.page;
              }
              return { page: nextPage };
            }, displayText(workflow.cancel_failed));
          },
          participantsLoading || pendingParticipantAdds.length === 0,
        )}
      >
        {participantsLoading ? (
          <div className="wf-participants__loading">
            <Spin />
            <span>{displayText(workflow.participants_loading)}</span>
          </div>
        ) : (
          <Form layout="vertical" className="workflow-start-form">
            {participantControls.length === 0 ? (
              <p>Additional participants cannot be added to this workflow.</p>
            ) : null}
            {participantControls.map((control, index) => {
              const groupName = control.participant_name?.trim();
              if (!groupName || !isAddableParticipantGroup(groupName, control.participant_strategy)) {
                return null;
              }
              const locked = existingParticipantIDs[groupName] ?? [];
              return (
                <div
                  key={`${control.type}-${groupName}-${index}`}
                  className="workflow-start-control"
                  data-field-api-name={workflowControlFieldName(control) || groupName}
                >
                  <WorkflowParticipantControl
                    control={control}
                    vaultId={vaultId}
                    objectName={objectName}
                    recordId={recordId}
                    value={participantValues[groupName] ?? locked}
                    lockedUserIDs={locked}
                    workflow={workflow}
                    onChange={(next) => {
                      setParticipantValues((prev) => ({
                        ...prev,
                        [groupName]: next,
                      }));
                    }}
                  />
                </div>
              );
            })}
          </Form>
        )}
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "email-participants") {
    return (
      <Modal
        open
        title={displayText(workflow.timeline_email_participants)}
        onCancel={onClose}
        footer={footer(displayText(workflow.timeline_email_participants), () => {
          void runMutation(
            () =>
              api.workflowEmailParticipants(vaultId, objectName, recordId, {
                workflow_instance_id: state.instance.workflow_instance_id,
                audience: emailAudience,
                message: emailMessage.trim(),
                cc_self: emailCcSelf,
                action_guard: guard,
                layout,
              }),
            displayText(workflow.cancel_failed),
          );
        })}
      >
        <Form layout="vertical">
          <Form.Item label="Recipients">
            <Select
              value={emailAudience}
              options={EMAIL_AUDIENCE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              onChange={setEmailAudience}
            />
          </Form.Item>
          <Form.Item label={displayText(workflow.comment_label)}>
            <Input.TextArea
              rows={3}
              maxLength={2000}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Checkbox checked={emailCcSelf} onChange={(e) => setEmailCcSelf(e.target.checked)}>
              CC myself
            </Checkbox>
          </Form.Item>
        </Form>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  if (state.kind === "update-workflow-due" || state.kind === "update-task-due") {
    const isWorkflow = state.kind === "update-workflow-due";
    const title = isWorkflow
      ? displayText(workflow.timeline_update_workflow_due_date)
      : displayText(workflow.timeline_update_task_due_date);
    return (
      <Modal
        open
        title={title}
        onCancel={onClose}
        footer={footer(displayText(shell.save), () => {
          void runMutation(
            () =>
              isWorkflow
                ? api.workflowUpdateDueDate(vaultId, objectName, recordId, {
                    workflow_instance_id: state.instance.workflow_instance_id,
                    due_date: dueDate.trim(),
                    action_guard: guard,
                    layout,
                  })
                : api.workflowUpdateTaskDueDate(vaultId, objectName, recordId, {
                    workflow_task_id: state.task.workflow_task_id,
                    due_date: dueDate.trim(),
                    action_guard: guard,
                    layout,
                  }),
            displayText(workflow.cancel_failed),
          );
        })}
      >
        <Form layout="vertical">
          <Form.Item label={displayText(workflow.timeline_due)}>
            <DateFieldInput
              value={dueDate}
              displayContext={displayContext}
              allowClear
              onChange={(next) => setDueDate(next ?? "")}
            />
          </Form.Item>
        </Form>
        {error ? <p className="workflow-task__error">{error}</p> : null}
      </Modal>
    );
  }

  return null;
}
