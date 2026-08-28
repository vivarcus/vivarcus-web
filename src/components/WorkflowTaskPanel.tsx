import { Button } from "antd";
import { useState } from "react";
import { api } from "../api/client";
import type {
  ActionGuard,
  RecordPageModel,
  StartNextWorkflowResult,
  WorkflowContentVerdict,
  WorkflowTaskAction,
} from "../api/types";
import { useUi } from "../context/UiContext";
import { handleStaleError } from "../lib/staleGuard";
import { defaultWorkflowChrome, displayText } from "../lib/i18n";
import { parseSoDExhausted } from "../lib/workflowSoD";
import { workflowDueTone } from "../lib/workflowDueDate";
import { WorkflowDueDateLabel } from "./WorkflowDueDateLabel";
import { WorkflowDueDateStatusIcon } from "./WorkflowDueDateStatusIcon";
import { SignatureModal } from "./SignatureModal";
import { TaskCompleteModal } from "./TaskCompleteModal";
import {
  WorkflowTimelineActionModals,
  type TimelineAdminModalState,
} from "./WorkflowTimelineActionModals";
import { taskHasSignatureRequirement } from "../lib/workflowTask";
import { isStartNextPrompt } from "../lib/startNextWorkflow";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  page: RecordPageModel;
  onPageUpdate: (page: RecordPageModel) => void;
  onError: (message: string) => void;
  onReloadPage?: () => Promise<void>;
  onStartNext?: (prompt: StartNextWorkflowResult) => void;
  variant?: "banner" | "section";
};

function actionGuard(page: RecordPageModel): ActionGuard {
  return {
    schema_fingerprint: page.schema_fingerprint,
    ui_fingerprint: page.ui_fingerprint,
    record_version: page.record_version,
  };
}

function taskTitle(task: WorkflowTaskAction, workflow: typeof defaultWorkflowChrome) {
  return task.task_label ?? task.task_api_name ?? displayText(workflow.task_fallback);
}

export function WorkflowTaskPanel({
  vaultId,
  objectName,
  recordId,
  page,
  onPageUpdate,
  onError,
  onReloadPage,
  onStartNext,
  variant = "banner",
}: Props) {
  const { shell } = useUi();
  const workflow = { ...defaultWorkflowChrome, ...(page.workflow ?? {}) };
  const tasks = page.workflow_tasks ?? [];
  const [completeTask, setCompleteTask] = useState<WorkflowTaskAction | null>(null);
  const [signatureTask, setSignatureTask] = useState<WorkflowTaskAction | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedByTask, setExpandedByTask] = useState<Record<string, boolean>>({});
  const [adminModal, setAdminModal] = useState<TimelineAdminModalState | null>(null);

  if (tasks.length === 0) {
    return null;
  }

  function isExpanded(task: WorkflowTaskAction) {
    const key = task.workflow_task_id ?? task.workflow_instance_id;
    if (expandedByTask[key] !== undefined) {
      return expandedByTask[key];
    }
    return Boolean(task.task_instructions?.trim());
  }

  function toggleExpanded(task: WorkflowTaskAction) {
    const key = task.workflow_task_id ?? task.workflow_instance_id;
    setExpandedByTask((prev) => ({
      ...prev,
      [key]: !isExpanded(task),
    }));
  }

  async function finishWithoutSignature(
    task: WorkflowTaskAction,
    verdictLabel: string,
    comment: string,
    fields: Record<string, string>,
    contentVerdicts?: WorkflowContentVerdict[],
  ) {
    if (!task.workflow_task_id) return;
    setBusy(task.workflow_task_id);
    onError("");
    try {
      const res = await api.workflowComplete(vaultId, objectName, recordId, {
        workflow_task_id: task.workflow_task_id,
        verdict_label: verdictLabel,
        comment,
        fields,
        content_verdicts: contentVerdicts,
        action_guard: actionGuard(page),
        layout: page.selected_layout.api_name,
      });
      onPageUpdate(res.page);
      if (isStartNextPrompt(res.start_next)) {
        onStartNext?.(res.start_next);
      }
      setCompleteTask(null);
    } catch (err) {
      const exhausted = parseSoDExhausted(err);
      if (exhausted) {
        const inst = (page.workflow_timeline?.instances ?? []).find(
          (row) => row.workflow_instance_id === exhausted.workflowInstanceId,
        );
        if (inst?.actions.can_add_participants) {
          setAdminModal({
            kind: "add-participants",
            instance: inst,
            focusGroup: exhausted.participantGroup,
          });
        }
        throw err;
      }
      const fallback = displayText(workflow.complete_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError, fallback, shell);
      } else {
        onError(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleCompleteSubmit(
    verdictLabel: string,
    comment: string,
    fields: Record<string, string>,
    contentVerdicts?: WorkflowContentVerdict[],
  ) {
    if (!completeTask) return;
    await finishWithoutSignature(completeTask, verdictLabel, comment, fields, contentVerdicts);
  }

  function openCompleteModal(task: WorkflowTaskAction) {
    if (taskHasSignatureRequirement(task)) {
      setSignatureTask(task);
      return;
    }
    setCompleteTask(task);
  }

  async function claimTask(task: WorkflowTaskAction) {
    if (!task.workflow_task_id) return;
    setBusy(task.workflow_task_id);
    onError("");
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
        await handleStaleError(err, onReloadPage, onError, fallback, shell);
      } else {
        onError(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  async function unclaimTask(task: WorkflowTaskAction) {
    if (!task.workflow_task_id) return;
    setBusy(task.workflow_task_id);
    onError("");
    try {
      const res = await api.workflowUnclaim(vaultId, objectName, recordId, {
        workflow_task_id: task.workflow_task_id,
        action_guard: actionGuard(page),
        layout: page.selected_layout.api_name,
      });
      onPageUpdate(res.page);
    } catch (err) {
      const fallback = displayText(workflow.unclaim_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError, fallback, shell);
      } else {
        onError(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  async function cancelWorkflow(task: WorkflowTaskAction) {
    const reason = window.prompt(
      displayText(workflow.cancel_reason_prompt),
      "user_cancelled",
    );
    if (!reason) return;
    setBusy(task.workflow_instance_id);
    onError("");
    try {
      const res = await api.workflowCancel(vaultId, objectName, recordId, {
        workflow_instance_id: task.workflow_instance_id,
        reason,
        action_guard: actionGuard(page),
        layout: page.selected_layout.api_name,
      });
      onPageUpdate(res.page);
    } catch (err) {
      const fallback = displayText(workflow.cancel_failed);
      if (onReloadPage) {
        await handleStaleError(err, onReloadPage, onError, fallback, shell);
      } else {
        onError(err instanceof Error ? err.message : fallback);
      }
    } finally {
      setBusy(null);
    }
  }

  function closeSignatureModal() {
    setSignatureTask(null);
  }

  function renderActions(task: WorkflowTaskAction) {
    const taskBusy =
      busy === task.workflow_task_id || busy === task.workflow_instance_id;
    return (
      <div className="workflow-task__actions">
        {task.can_claim && (
          <Button
            type="primary"
            disabled={busy !== null}
            loading={taskBusy}
            onClick={() => void claimTask(task)}
          >
            {displayText(workflow.claim_task)}
          </Button>
        )}
        {task.can_unclaim && (
          <Button
            disabled={busy !== null}
            loading={taskBusy}
            onClick={() => void unclaimTask(task)}
          >
            {displayText(workflow.unclaim_task)}
          </Button>
        )}
        {task.can_complete && (
          <Button
            type="primary"
            disabled={busy !== null}
            loading={taskBusy}
            onClick={() => openCompleteModal(task)}
          >
            {taskBusy ? displayText(workflow.processing) : displayText(workflow.complete_task)}
          </Button>
        )}
        {task.can_cancel && variant === "section" && (
          <Button
            type="text"
            disabled={busy !== null}
            loading={busy === task.workflow_instance_id}
            onClick={() => void cancelWorkflow(task)}
          >
            {displayText(workflow.cancel_workflow)}
          </Button>
        )}
      </div>
    );
  }

  function renderDueDate(task: WorkflowTaskAction) {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") {
      return null;
    }
    return (
      <div className="workflow-task-banner__due">
        <WorkflowDueDateLabel
          dueDate={task.due_date}
          dueDateStatus={task.due_date_status}
          workflow={workflow}
        />
      </div>
    );
  }

  function renderBannerTask(task: WorkflowTaskAction) {
    const instructions = task.task_instructions?.trim() ?? "";
    const expanded = isExpanded(task);
    const title = taskTitle(task, workflow);
    const tone = workflowDueTone(task.due_date, task.due_date_status);

    return (
      <div
        key={task.workflow_task_id ?? task.workflow_instance_id}
        className={`workflow-task-banner workflow-task-banner--${tone}`}
      >
        <div className="workflow-task-banner__main">
          <WorkflowDueDateStatusIcon
            dueDate={task.due_date}
            dueDateStatus={task.due_date_status}
            className="workflow-task-banner__icon"
          />
          <div className="workflow-task-banner__content">
            <div className="workflow-task-banner__title-row">
              <strong className="workflow-task-banner__title">{title}</strong>
              {instructions && (
                <button
                  type="button"
                  className="workflow-task-banner__toggle"
                  onClick={() => toggleExpanded(task)}
                >
                  {expanded
                    ? displayText(workflow.show_less)
                    : displayText(workflow.show_more)}
                </button>
              )}
            </div>
            {expanded && instructions && (
              <div className="workflow-task-banner__instructions">
                <span className="workflow-task-banner__instructions-label">
                  {displayText(workflow.instructions_label)}
                </span>
                <span className="workflow-task-banner__instructions-text">{instructions}</span>
              </div>
            )}
            {renderDueDate(task)}
          </div>
        </div>
        <div className="workflow-task-banner__actions">{renderActions(task)}</div>
      </div>
    );
  }

  function renderSectionTask(task: WorkflowTaskAction) {
    return (
      <li key={task.workflow_task_id ?? task.workflow_instance_id} className="workflow-task">
        <div className="workflow-task__info">
          <strong>{taskTitle(task, workflow)}</strong>
          <span className="workflow-task__meta">
            {task.workflow_label} · {task.status}
            {task.verdict_label && ` · ${task.verdict_label}`}
          </span>
          {task.due_date &&
          task.status !== "completed" &&
          task.status !== "cancelled" ? (
            <span className="workflow-task__meta workflow-task__meta--due">
              <WorkflowDueDateLabel
                dueDate={task.due_date}
                dueDateStatus={task.due_date_status}
                workflow={workflow}
              />
            </span>
          ) : null}
          {task.task_instructions?.trim() && (
            <p className="workflow-task__instructions">
              <span className="workflow-task__instructions-label">
                {displayText(workflow.instructions_label)}
              </span>
              {task.task_instructions}
            </p>
          )}
        </div>
        {renderActions(task)}
      </li>
    );
  }

  return (
    <>
      {variant === "banner" ? (
        <div className="workflow-task-banner-stack">
          {tasks.map((task) => renderBannerTask(task))}
        </div>
      ) : (
        <section className="workflow-panel">
          <h2 className="workflow-panel__title">{displayText(workflow.title)}</h2>
          <ul className="workflow-panel__list">
            {tasks.map((task) => renderSectionTask(task))}
          </ul>
        </section>
      )}

      {completeTask && (
        <TaskCompleteModal
          task={completeTask}
          workflow={workflow}
          onClose={() => setCompleteTask(null)}
          onSubmit={handleCompleteSubmit}
        />
      )}

      {signatureTask && (
        <SignatureModal
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
          task={signatureTask}
          page={page}
          workflow={workflow}
          onClose={closeSignatureModal}
          onSuccess={(nextPage, startNext) => {
            onPageUpdate(nextPage);
            if (isStartNextPrompt(startNext)) {
              onStartNext?.(startNext);
            }
            closeSignatureModal();
          }}
          onError={onError}
          onReloadPage={onReloadPage}
        />
      )}

      <WorkflowTimelineActionModals
        state={adminModal}
        onClose={() => setAdminModal(null)}
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        page={page}
        workflow={workflow}
        onPageUpdate={onPageUpdate}
        onError={onError}
        onReloadPage={onReloadPage}
      />
    </>
  );
}
