import { Button, Dropdown, Empty } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleFilled,
  CloseCircleOutlined,
  DownOutlined,
  MoreOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type {
  ActionGuard,
  RecordPageModel,
  WorkflowParticipantsModel,
  WorkflowTimelineInstance,
  WorkflowTimelineModel,
  WorkflowTimelineTask,
} from "../api/types";
import { useUi } from "../context/UiContext";
import { handleStaleError } from "../lib/staleGuard";
import { defaultWorkflowChrome, displayText, formatFieldDisplayValue, type WorkflowChrome } from "../lib/i18n";
import { computeDueDateStatus } from "../lib/workflowDueDate";
import { WorkflowParticipantsModal } from "./WorkflowParticipantsModal";
import { TaskCompleteModal } from "./TaskCompleteModal";
import { SignatureModal } from "./SignatureModal";
import {
  WorkflowTimelineActionModals,
  type TimelineAdminModalState,
} from "./WorkflowTimelineActionModals";
import { WorkflowDueDateLabel } from "./WorkflowDueDateLabel";
import { WorkflowDueDateStatusIcon } from "./WorkflowDueDateStatusIcon";
import { UserAvatar } from "./UserAvatar";
import { timelineTasksForDisplay } from "./workflowTimelineSort";
import { enrichTimelineTaskAction } from "./workflowTimelineTaskAction";
import type { WorkflowTaskAction } from "../api/types";
import { taskHasSignatureRequirement } from "../lib/workflowTask";

type Props = {
  timeline?: WorkflowTimelineModel;
  workflow?: WorkflowChrome;
  vaultId?: string;
  objectName?: string;
  recordId?: string;
  page?: RecordPageModel;
  onPageUpdate?: (page: RecordPageModel) => void;
  onError?: (message: string) => void;
  onReloadPage?: () => Promise<void>;
};

function actionGuard(page: RecordPageModel): ActionGuard {
  return {
    schema_fingerprint: page.schema_fingerprint,
    ui_fingerprint: page.ui_fingerprint,
    record_version: page.record_version,
  };
}

function isTaskActive(task: WorkflowTimelineTask) {
  return task.status === "available" || task.status === "active" || task.status === "signature_pending";
}

function isTaskCancelled(task: WorkflowTimelineTask) {
  return task.status === "cancelled" || task.status === "rejected";
}

function workflowTaskSummary(inst: WorkflowTimelineInstance) {
  const activeCount = inst.active_task_count;
  const completedCount = inst.completed_task_count;
  const totalCount = inst.total_task_count;
  if (activeCount > 0) {
    return `${activeCount} Task${activeCount === 1 ? "" : "s"} Active of ${totalCount} Task${totalCount === 1 ? "" : "s"}`;
  }
  return `${completedCount} Task${completedCount === 1 ? "" : "s"} Complete of ${totalCount} Task${totalCount === 1 ? "" : "s"}`;
}

const SYSTEM_PRINCIPAL_USER_ID = "00000000-0000-4000-a000-000000000001";

function activeWorkflowDueDate(inst: WorkflowTimelineInstance) {
  if (inst.due_date?.trim()) {
    return {
      due_date: inst.due_date,
      due_date_status:
        computeDueDateStatus(inst.due_date, inst.status === "active" ? "active" : inst.status) ||
        undefined,
    };
  }
  const activeTask = inst.tasks?.find(
    (task) =>
      (task.status === "available" ||
        task.status === "active" ||
        task.status === "signature_pending") &&
      task.due_date?.trim(),
  );
  if (!activeTask?.due_date) {
    return null;
  }
  return {
    due_date: activeTask.due_date,
    due_date_status: activeTask.due_date_status || computeDueDateStatus(activeTask.due_date, activeTask.status),
  };
}

function workflowActionSummary(
  inst: WorkflowTimelineInstance,
  formatDateTime: (value?: string) => string,
  workflow: WorkflowChrome,
) {
  let base: string;
  if (inst.status === "completed") {
    const at = inst.finished_at || inst.started_at;
    base = `${displayText(workflow.timeline_completed)}: ${formatDateTime(at) || at || "—"}`;
  } else if (inst.status === "cancelled") {
    base = `${displayText(workflow.timeline_cancelled)}: ${formatDateTime(inst.finished_at || inst.started_at)}`;
  } else {
    base = `${displayText(workflow.timeline_started)}: ${formatDateTime(inst.started_at)}`;
  }
  if (inst.status !== "active") {
    return (
      <>
        {base}
        {workflowVersionMeta(inst, workflow)}
      </>
    );
  }
  const due = activeWorkflowDueDate(inst);
  if (!due?.due_date) {
    return (
      <>
        {base}
        {workflowVersionMeta(inst, workflow)}
      </>
    );
  }
  return (
    <>
      {base}
      {" · "}
      <WorkflowDueDateLabel
        dueDate={due.due_date}
        dueDateStatus={due.due_date_status}
        workflow={workflow}
      />
      {workflowVersionMeta(inst, workflow)}
    </>
  );
}

function workflowVersionMeta(inst: WorkflowTimelineInstance, workflow: WorkflowChrome) {
  if (!inst.definition_version || inst.definition_version < 1) {
    return null;
  }
  return (
    <>
      {" · "}
      {displayText(workflow.timeline_version)} {inst.definition_version}
    </>
  );
}

function stateChangeLabel(change: { target_state_label?: string; target_state_name: string }) {
  return change.target_state_label?.trim() || change.target_state_name;
}

function stateChangeTitle(
  change: {
    action_label?: string;
    target_state_label?: string;
    target_state_name: string;
  },
  workflow: WorkflowChrome,
) {
  if (change.action_label?.trim()) {
    return change.action_label.trim();
  }
  return `${displayText(workflow.timeline_state_change)} ${stateChangeLabel(change)}`;
}

function sourceStateLabel(change: { source_state_label?: string; source_state_name?: string }) {
  return change.source_state_label?.trim() || change.source_state_name || "";
}

function formatUser(user?: { display_name?: string; user_id: string }, fallback = "—") {
  if (!user) return fallback;
  if (user.user_id === SYSTEM_PRINCIPAL_USER_ID) return "System";
  return user.display_name?.trim() || user.user_id;
}

function WorkflowTimelineUserRow({
  user,
  vaultId,
  children,
  fallback = "—",
}: {
  user?: { display_name?: string; user_id: string; avatar_url?: string };
  vaultId?: string;
  children?: ReactNode;
  fallback?: string;
}) {
  return (
    <div className="workflow-timeline-user">
      <UserAvatar
        vaultId={vaultId}
        imageUrl={user?.avatar_url}
        alt={formatUser(user, fallback)}
        className="workflow-timeline-user-avatar"
        fallback={<UserOutlined />}
      />
      <div className="workflow-timeline-user-body">
        <div className="workflow-timeline-user-name">{formatUser(user, fallback)}</div>
        {children}
      </div>
    </div>
  );
}

export function WorkflowTimeline({
  timeline,
  workflow: workflowProp,
  vaultId,
  objectName,
  recordId,
  page,
  onPageUpdate,
  onError,
  onReloadPage,
}: Props) {
  const { shell, displayContext } = useUi();
  const workflow = useMemo(
    () => ({ ...defaultWorkflowChrome, ...workflowProp }),
    [workflowProp],
  );
  const formatDateTime = (value?: string) =>
    formatFieldDisplayValue(value, "DateTime", displayContext);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [signatureTask, setSignatureTask] = useState<WorkflowTaskAction | null>(null);
  const [completeTask, setCompleteTask] = useState<WorkflowTaskAction | null>(null);
  const [adminModal, setAdminModal] = useState<TimelineAdminModalState | null>(null);
  const [participants, setParticipants] = useState<WorkflowParticipantsModel | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantsWorkflowLabel, setParticipantsWorkflowLabel] = useState("");

  const instances = timeline?.instances ?? [];
  const stateChanges = timeline?.state_changes ?? [];
  const interactive = Boolean(page && vaultId && objectName && recordId && onPageUpdate);

  const toggleRow = (rowKey: string) => {
    setExpanded((prev) => ({
      ...prev,
      [rowKey]: !(prev[rowKey] ?? false),
    }));
  };

  const isRowOpen = (rowKey: string) => expanded[rowKey] ?? false;

  const empty =
    instances.length === 0 && stateChanges.length === 0;

  function renderExpandButton(rowKey: string, label: string) {
    const open = isRowOpen(rowKey);
    return (
      <button
        type="button"
        className="workflow-timeline-expand"
        aria-expanded={open}
        aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        onClick={() => toggleRow(rowKey)}
      >
        <DownOutlined rotate={open ? 0 : -90} />
      </button>
    );
  }

  const mergedEvents = useMemo(() => {
    type Row =
      | { kind: "state"; at: string; key: string; change: (typeof stateChanges)[number] }
      | { kind: "instance"; at: string; key: string; instance: WorkflowTimelineInstance };
    const rows: Row[] = [];
    for (const change of stateChanges) {
      rows.push({
        kind: "state",
        at: change.occurred_at,
        key: `state:${change.occurred_at}:${change.target_state_name}`,
        change,
      });
    }
    for (const inst of instances) {
      rows.push({
        kind: "instance",
        at: inst.started_at,
        key: inst.workflow_instance_id,
        instance: inst,
      });
    }
    rows.sort((a, b) => b.at.localeCompare(a.at));
    return rows;
  }, [instances, stateChanges]);

  if (empty) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={displayText(workflow.empty_timeline)} />;
  }

  async function finishWithoutSignature(
    task: WorkflowTaskAction,
    verdictLabel: string,
    comment: string,
    fields: Record<string, string>,
  ) {
    if (!interactive || !page || !vaultId || !objectName || !recordId || !onPageUpdate || !task.workflow_task_id) {
      return;
    }
    setBusy(task.workflow_task_id);
    onError?.("");
    try {
      const res = await api.workflowComplete(vaultId, objectName, recordId, {
        workflow_task_id: task.workflow_task_id,
        verdict_label: verdictLabel,
        comment,
        fields,
        action_guard: actionGuard(page),
        layout: page.selected_layout.api_name,
      });
      onPageUpdate(res.page);
      setCompleteTask(null);
    } catch (err) {
      const fallback = displayText(workflow.complete_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError ?? (() => {}), fallback, shell);
      } else {
        onError?.(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleCompleteSubmit(
    verdictLabel: string,
    comment: string,
    fields: Record<string, string>,
  ) {
    if (!completeTask) return;
    await finishWithoutSignature(completeTask, verdictLabel, comment, fields);
  }

  function openCompleteModal(task: WorkflowTaskAction) {
    if (taskHasSignatureRequirement(task)) {
      setSignatureTask(task);
      return;
    }
    setCompleteTask(task);
  }

  async function claimTask(task: WorkflowTaskAction) {
    if (!interactive || !page || !vaultId || !objectName || !recordId || !onPageUpdate || !task.workflow_task_id) {
      return;
    }
    setBusy(task.workflow_task_id);
    onError?.("");
    try {
      const res = await api.workflowClaim(vaultId, objectName, recordId, {
        workflow_task_id: task.workflow_task_id,
        action_guard: actionGuard(page),
        layout: page.selected_layout.api_name,
      });
      onPageUpdate(res.page);
    } catch (err) {
      const fallback = displayText(workflow.complete_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError ?? (() => {}), fallback, shell);
      } else {
        onError?.(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  async function openParticipants(instance: WorkflowTimelineInstance) {
    if (!vaultId || !objectName || !recordId) return;
    onError?.("");
    setParticipants(null);
    setParticipantsError(null);
    setParticipantsWorkflowLabel(instance.workflow_label || instance.workflow_api_name);
    setParticipantsLoading(true);
    try {
      const res = await api.workflowParticipants(
        vaultId,
        objectName,
        recordId,
        instance.workflow_instance_id,
      );
      setParticipants(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : displayText(workflow.refresh_failed);
      setParticipantsError(message);
      onError?.(message);
    } finally {
      setParticipantsLoading(false);
    }
  }

  function closeParticipants() {
    setParticipants(null);
    setParticipantsError(null);
    setParticipantsWorkflowLabel("");
  }

  function instanceMenu(inst: WorkflowTimelineInstance): MenuProps["items"] {
    const items: MenuProps["items"] = [];
    if (inst.actions.can_cancel_workflow) {
      items.push({
        key: "cancel",
        label: displayText(workflow.cancel_workflow),
        onClick: () => setAdminModal({ kind: "cancel-workflow", instance: inst }),
      });
    }
    if (inst.actions.can_add_participants) {
      items.push({
        key: "add-participants",
        label: displayText(workflow.timeline_add_participants),
        onClick: () => setAdminModal({ kind: "add-participants", instance: inst }),
      });
    }
    if (inst.actions.can_replace_owner) {
      items.push({
        key: "replace-owner",
        label: displayText(workflow.timeline_replace_owner),
        onClick: () => setAdminModal({ kind: "replace-owner", instance: inst }),
      });
    }
    if (inst.actions.can_email_participants) {
      items.push({
        key: "email-participants",
        label: displayText(workflow.timeline_email_participants),
        onClick: () => setAdminModal({ kind: "email-participants", instance: inst }),
      });
    }
    if (inst.actions.can_update_workflow_due_date) {
      items.push({
        key: "update-workflow-due",
        label: displayText(workflow.timeline_update_workflow_due_date),
        onClick: () => setAdminModal({ kind: "update-workflow-due", instance: inst }),
      });
    }
    if (inst.actions.can_view_participants) {
      items.push({
        key: "participants",
        label: displayText(workflow.timeline_view_participants),
        onClick: () => void openParticipants(inst),
      });
    }
    return items;
  }

  function renderInstanceMenu(inst: WorkflowTimelineInstance, busyId?: string) {
    const menu = instanceMenu(inst);
    return (
      <Dropdown menu={{ items: menu }} trigger={["click"]}>
        <Button
          className="workflow-timeline-action-menu"
          type="text"
          size="small"
          icon={<MoreOutlined />}
          loading={busyId === inst.workflow_instance_id}
        />
      </Dropdown>
    );
  }

  function taskMenu(inst: WorkflowTimelineInstance, task: WorkflowTimelineTask): MenuProps["items"] {
    const items: MenuProps["items"] = [];
    const enriched = enrichTimelineTaskAction(inst, task, page);
    if (enriched.can_claim) {
      items.push({
        key: "claim",
        label: displayText(workflow.claim_task),
        onClick: () => void claimTask(enriched),
      });
    }
    if (task.actions.can_complete) {
      items.push({
        key: "complete",
        label: task.signature_required
          ? displayText(workflow.sign_and_complete)
          : displayText(workflow.complete_task),
        onClick: () => openCompleteModal(enriched),
      });
    }
    if (task.actions.can_update_task_due_date) {
      items.push({
        key: "update-task-due",
        label: displayText(workflow.timeline_update_task_due_date),
        onClick: () => setAdminModal({ kind: "update-task-due", instance: inst, task }),
      });
    }
    if (task.actions.can_reassign) {
      items.push({
        key: "reassign",
        label: displayText(workflow.timeline_reassign_task),
        onClick: () => setAdminModal({ kind: "reassign-task", instance: inst, task }),
      });
    }
    if (task.actions.can_cancel_task) {
      items.push({
        key: "cancel-task",
        label: displayText(workflow.timeline_cancel_task),
        onClick: () => setAdminModal({ kind: "cancel-task", instance: inst, task }),
      });
    }
    return items;
  }

  return (
    <>
      <div className="workflow-timeline">
        {timeline?.tasks_truncated ? (
          <p className="workflow-timeline__notice">{displayText(workflow.timeline_tasks_truncated)}</p>
        ) : null}
        <div className="workflow-timeline-header">
          <div>{displayText(workflow.timeline_action_column)}</div>
          <div>{displayText(workflow.timeline_details_column)}</div>
        </div>
        {mergedEvents.map((row) => {
          if (row.kind === "state") {
            const open = isRowOpen(row.key);
            return (
              <div
                key={row.key}
                className="workflow-timeline-workflow workflow-timeline-workflow--state"
              >
                <div className={`workflow-timeline-row${open ? "" : " workflow-timeline-row--collapsed"}`}>
                  <div className="workflow-timeline-action">
                    <div className="workflow-timeline-action-main">
                      {renderExpandButton(row.key, stateChangeTitle(row.change, workflow))}
                      <div>
                        <div className="workflow-timeline-title">
                          {stateChangeTitle(row.change, workflow)}
                        </div>
                        <div className="workflow-timeline-meta">
                          {formatDateTime(row.change.occurred_at) || row.change.occurred_at}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="workflow-timeline-details">
                    {open ? (
                      <div className="workflow-timeline-state-details">
                        {row.change.source_state_name ? (
                          <span>
                            {displayText(workflow.timeline_from_state)}{" "}
                            {sourceStateLabel(row.change)}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }

          const inst = row.instance;
          const open = isRowOpen(row.key);
          const workflowActive = inst.status === "active";
          const tasks = timelineTasksForDisplay(inst.tasks);
          const title = inst.workflow_label || inst.workflow_api_name;

          return (
            <div
              key={row.key}
              className={`workflow-timeline-workflow${workflowActive ? " active" : ""}`}
            >
              <div className={`workflow-timeline-row${open ? "" : " workflow-timeline-row--collapsed"}`}>
                <div className="workflow-timeline-action">
                  <div className="workflow-timeline-action-main">
                    {renderExpandButton(row.key, title)}
                    <div className="workflow-timeline-action-content">
                      <div className="workflow-timeline-action-head">
                        <div className="workflow-timeline-title">{title}</div>
                        {renderInstanceMenu(inst)}
                      </div>
                      {!open ? (
                        <div className="workflow-timeline-meta">
                          {workflowActionSummary(inst, formatDateTime, workflow)}
                        </div>
                      ) : (
                        <WorkflowTimelineUserRow user={inst.owner} vaultId={vaultId}>
                          <div className="workflow-timeline-meta">
                            {workflowActionSummary(inst, formatDateTime, workflow)}
                          </div>
                        </WorkflowTimelineUserRow>
                      )}
                    </div>
                  </div>
                </div>
                <div className="workflow-timeline-details">
                  {open && tasks.length > 0 ? (
                    <div className="workflow-timeline-tasks">
                      {tasks.map((task) => {
                        const tMenu = taskMenu(inst, task);
                        return (
                          <div
                            key={task.workflow_task_id}
                            className={`workflow-timeline-task${isTaskActive(task) ? " active" : ""}`}
                          >
                            <div className="workflow-timeline-task-main">
                              {task.status === "completed" ? (
                                <CheckCircleFilled className="workflow-timeline-task-icon completed" />
                              ) : isTaskCancelled(task) ? (
                                <CloseCircleOutlined className="workflow-timeline-task-icon cancelled" />
                              ) : (
                                <WorkflowDueDateStatusIcon
                                  dueDate={task.due_date}
                                  dueDateStatus={task.due_date_status}
                                  className="workflow-timeline-task-icon"
                                />
                              )}
                              <div className="workflow-timeline-task-content">
                                <div className="workflow-timeline-task-title">
                                  {task.task_label || task.task_api_name}
                                </div>
                                {task.status === "completed" ? (
                                  <WorkflowTimelineUserRow
                                    user={task.assignee}
                                    vaultId={vaultId}
                                    fallback={displayText(workflow.timeline_unassigned)}
                                  >
                                    {task.verdict_label ? (
                                      <div className="workflow-timeline-task-meta">
                                        {displayText(workflow.verdict_label)}: {task.verdict_label}
                                      </div>
                                    ) : null}
                                    {task.completion_comment ? (
                                      <div className="workflow-timeline-task-meta">
                                        {displayText(workflow.verdict_comment)}: {task.completion_comment}
                                      </div>
                                    ) : null}
                                    {task.completed_at ? (
                                      <div className="workflow-timeline-task-meta workflow-timeline-task-meta--secondary">
                                        {displayText(workflow.timeline_completed)}:{" "}
                                        {formatDateTime(task.completed_at)}
                                      </div>
                                    ) : null}
                                  </WorkflowTimelineUserRow>
                                ) : task.status === "available" &&
                                  (task.available_assignees?.length ?? 0) > 0 ? (
                                  <>
                                    {task.available_assignees!.map((candidate) => (
                                      <WorkflowTimelineUserRow
                                        key={candidate.user_id}
                                        user={candidate}
                                        vaultId={vaultId}
                                      >
                                        <div className="workflow-timeline-task-meta workflow-timeline-task-meta--secondary">
                                          {displayText(workflow.participants_task_status_potential)}
                                        </div>
                                      </WorkflowTimelineUserRow>
                                    ))}
                                    {task.due_date ? (
                                      <div className="workflow-timeline-task-meta workflow-timeline-task-meta--due">
                                        <WorkflowDueDateLabel
                                          dueDate={task.due_date}
                                          dueDateStatus={task.due_date_status}
                                          workflow={workflow}
                                        />
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    {task.assignee ? (
                                      <WorkflowTimelineUserRow user={task.assignee} vaultId={vaultId} />
                                    ) : (
                                      <div className="workflow-timeline-task-meta">
                                        <UserOutlined />{" "}
                                        {displayText(workflow.timeline_unassigned)}
                                      </div>
                                    )}
                                    {task.completed_at ? (
                                      <div className="workflow-timeline-task-meta">
                                        {displayText(workflow.timeline_finished)}:{" "}
                                        {formatDateTime(task.completed_at)}
                                      </div>
                                    ) : null}
                                    {!task.completed_at && task.due_date ? (
                                      <div className="workflow-timeline-task-meta workflow-timeline-task-meta--due">
                                        <WorkflowDueDateLabel
                                          dueDate={task.due_date}
                                          dueDateStatus={task.due_date_status}
                                          workflow={workflow}
                                        />
                                      </div>
                                    ) : null}
                                  </>
                                )}
                                {task.signature_required ? (
                                  <div className="workflow-timeline-task-meta">
                                    <span className="badge badge--default">
                                      {displayText(workflow.signature_required_badge)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {tMenu && tMenu.length > 0 ? (
                              <div className="workflow-timeline-task-actions">
                                <Dropdown menu={{ items: tMenu }} trigger={["click"]}>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<MoreOutlined />}
                                    loading={busy === task.workflow_task_id}
                                  />
                                </Dropdown>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : tasks.length > 0 ? (
                    <span className="workflow-timeline-summary">{workflowTaskSummary(inst)}</span>
                  ) : (
                    <span className="workflow-timeline-empty-details">
                      {displayText(workflow.timeline_no_tasks)}
                    </span>
                  )}
                </div>
              </div>
              {open && inst.cancellation_comment ? (
                <p className="workflow-timeline-comment">{inst.cancellation_comment}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {completeTask ? (
        <TaskCompleteModal
          task={completeTask}
          workflow={workflow}
          onClose={() => setCompleteTask(null)}
          onSubmit={handleCompleteSubmit}
        />
      ) : null}

      {interactive && page && vaultId && objectName && recordId && onPageUpdate ? (
        <WorkflowTimelineActionModals
          state={adminModal}
          onClose={() => setAdminModal(null)}
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
          page={page}
          workflow={workflow}
          onPageUpdate={onPageUpdate}
          onError={onError ?? (() => {})}
          onReloadPage={onReloadPage}
        />
      ) : null}

      {signatureTask && interactive && page && vaultId && objectName && recordId && onPageUpdate ? (
        <SignatureModal
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
          task={signatureTask}
          page={page}
          workflow={workflow}
          onClose={() => setSignatureTask(null)}
          onSuccess={(page) => {
            onPageUpdate(page);
            setSignatureTask(null);
          }}
          onError={onError}
          onReloadPage={onReloadPage}
        />
      ) : null}

      <WorkflowParticipantsModal
        open={participants !== null || participantsLoading || participantsError !== null}
        loading={participantsLoading}
        error={participantsError}
        participants={participants}
        workflowLabel={participantsWorkflowLabel}
        workflow={workflow}
        displayContext={displayContext}
        onClose={closeParticipants}
      />
    </>
  );
}
