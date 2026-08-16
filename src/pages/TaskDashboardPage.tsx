import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  InboxOutlined,
  PartitionOutlined,
  RightOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import type {
  RecordPageModel,
  TaskDashboardModel,
  TaskDashboardTaskItem,
  WorkflowTaskAction,
} from "../api/types";
import { useUi } from "../context/UiContext";
import { useHeaderUserIdentity } from "../hooks/useHeaderUserIdentity";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate, defaultTaskDashboardChrome, defaultWorkflowChrome } from "../lib/i18n";
import type { TaskDashboardChrome } from "../lib/i18n/chromeTypes";
import { taskHasSignatureRequirement, workflowTaskActionFromDashboard } from "../lib/workflowTask";
import { UserAvatar } from "../components/UserAvatar";
import { SignatureModal } from "../components/SignatureModal";
import { TaskCompleteModal } from "../components/TaskCompleteModal";

dayjs.extend(relativeTime);

const PAGE_SIZE = 50;

type TaskView = "all_tasks" | "my_tasks" | "available_tasks" | "active_workflows";
type LayoutMode = "detail" | "grid";

const viewOptions: Array<{
  key: TaskView;
  labelKey: keyof Pick<
    TaskDashboardChrome,
    "all_tasks" | "my_tasks" | "available_tasks" | "active_workflows"
  >;
  icon: ReactNode;
}> = [
  { key: "all_tasks", labelKey: "all_tasks", icon: <CheckCircleOutlined /> },
  { key: "my_tasks", labelKey: "my_tasks", icon: <UserOutlined /> },
  { key: "available_tasks", labelKey: "available_tasks", icon: <TeamOutlined /> },
  { key: "active_workflows", labelKey: "active_workflows", icon: <PartitionOutlined /> },
];

const duePresetValues = ["overdue", "due_today", "next_7_days", "no_due_date"] as const;
const ownerScopeValues = ["me", "unassigned"] as const;

type HomeFiltersState = {
  contentTypes: string[];
  duePresets: string[];
  dueFrom: string;
  dueTo: string;
  ownerScopes: string[];
  assignedFrom: string;
  assignedTo: string;
  workflows: string[];
  contentCounts: string[];
};

const emptyFilters: HomeFiltersState = {
  contentTypes: [],
  duePresets: [],
  dueFrom: "",
  dueTo: "",
  ownerScopes: [],
  assignedFrom: "",
  assignedTo: "",
  workflows: [],
  contentCounts: [],
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function filtersActive(filters: HomeFiltersState) {
  return (
    filters.contentTypes.length > 0 ||
    filters.duePresets.length > 0 ||
    Boolean(filters.dueFrom) ||
    Boolean(filters.dueTo) ||
    filters.ownerScopes.length > 0 ||
    Boolean(filters.assignedFrom) ||
    Boolean(filters.assignedTo) ||
    filters.workflows.length > 0 ||
    filters.contentCounts.length > 0
  );
}

function FilterGroup({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`home-filter-group${expanded ? " expanded" : ""}`}>
      <button type="button" className="home-filter-row" onClick={onToggle}>
        <RightOutlined className={expanded ? "home-filter-chevron open" : "home-filter-chevron"} />
        <span>{title}</span>
      </button>
      {expanded && <div className="home-filter-body">{children}</div>}
    </div>
  );
}

function countForView(model: TaskDashboardModel | null, view: TaskView) {
  if (!model) return 0;
  if (view === "my_tasks") return model.view_counts.my_tasks;
  if (view === "available_tasks") return model.view_counts.available_tasks ?? 0;
  if (view === "active_workflows") return model.view_counts.active_workflows ?? 0;
  return model.view_counts.all_tasks;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

function formatDue(value: string | null | undefined, chrome: TaskDashboardChrome) {
  if (!value) {
    return displayText(chrome.no_due_date);
  }
  return displayTextTemplate(chrome.due_date_prefix, { date: formatDate(value) });
}

function formatTitleTimestamp(value?: string | null) {
  if (!value) return "";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  const days = Math.abs(dayjs().diff(parsed, "day"));
  if (days < 14) return parsed.fromNow();
  return parsed.format("DD MMM YYYY");
}

function dueStatusTitle(status: TaskDashboardTaskItem["due_status"], chrome: TaskDashboardChrome) {
  if (status === "overdue") {
    return displayText(chrome.task_overdue);
  }
  if (status === "due_soon") {
    return displayText(chrome.task_coming_due);
  }
  return undefined;
}

function dueIcon(task: TaskDashboardTaskItem, chrome: TaskDashboardChrome) {
  const title = dueStatusTitle(task.due_status, chrome);
  if (task.due_status === "overdue") {
    return <ExclamationCircleFilled className="home-task-status overdue" title={title} />;
  }
  if (task.due_status === "due_soon") {
    return <ClockCircleFilled className="home-task-status soon" title={title} />;
  }
  if (task.due_status === "none") {
    return <ClockCircleOutlined className="home-task-status none" title={title} />;
  }
  return <RightOutlined className="home-task-status ok" title={title} />;
}

function contentLinkLabel(task: TaskDashboardTaskItem) {
  if (!task.record_name) return "";
  if (task.object_label) return `${task.object_label} > ${task.record_name}`;
  return task.record_name;
}

function TaskRow({
  task,
  chrome,
  onComplete,
  onAccept,
  completing,
  accepting,
}: {
  task: TaskDashboardTaskItem;
  chrome: TaskDashboardChrome;
  onComplete?: (task: TaskDashboardTaskItem) => void;
  onAccept?: (task: TaskDashboardTaskItem) => void;
  completing?: boolean;
  accepting?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const path = task.record_detail_href;
  const contentLabel = contentLinkLabel(task);
  const titleTimestamp = formatTitleTimestamp(task.title_timestamp);
  const isWorkflow = task.task_kind === "workflow_task";
  const canExpand = isWorkflow && Boolean(task.instructions || task.owner);
  const showComplete =
    task.can_complete &&
    onComplete &&
    ((task.task_kind === "user_task" &&
      task.complete_action &&
      task.object_api_name &&
      task.record_id) ||
      (task.task_kind === "workflow_task" &&
        task.complete_action === "workflow_complete" &&
        Boolean(task.workflow_task_id) &&
        Boolean(task.object_api_name) &&
        Boolean(task.record_id)));
  const showContinue = Boolean(task.can_continue && path);
  const showAccept = Boolean(task.can_accept && task.workflow_task_id && onAccept);
  const requiredLabel = displayText(chrome.required);

  const contentNode = contentLabel ? (
    path ? (
      <Link to={path} className="home-task-content-link" onClick={(e) => e.stopPropagation()}>
        {contentLabel}
      </Link>
    ) : (
      <span>{contentLabel}</span>
    )
  ) : null;

  return (
    <div className="home-task-row">
      <div className="home-task-main">
        {dueIcon(task, chrome)}
        <div className="home-task-body">
          <div className="home-task-title-row">
            <div className="home-task-title">
              <span className="home-task-name">{task.name}</span>
              {contentNode && (
                <>
                  <span className="home-task-separator"> </span>
                  {contentNode}
                </>
              )}
              {task.required && (
                <span className="home-task-required" title={requiredLabel} aria-label={requiredLabel}>
                  *
                </span>
              )}
            </div>
            {titleTimestamp && <span className="home-task-title-time">{titleTimestamp}</span>}
          </div>
          <div className="home-task-meta">
            {task.due_date ? (
              <strong>{formatDue(task.due_date, chrome)}</strong>
            ) : (
              <span>{formatDue(task.due_date, chrome)}</span>
            )}
            {task.task_kind === "active_workflow" ? (
              <>
                {task.owner && (
                  <span>
                    {displayText(chrome.owner_label)}: {task.owner}
                  </span>
                )}
                {task.task_progress && (
                  <span>
                    {displayTextTemplate(chrome.tasks_count, { count: task.task_progress })}
                  </span>
                )}
                {task.workflow_version && task.workflow_version > 0 && (
                  <span>
                    {displayText(defaultWorkflowChrome.timeline_version)} {task.workflow_version}
                  </span>
                )}
              </>
            ) : task.assigned_to_you ? (
              <span>{displayText(chrome.assigned_to_you)}</span>
            ) : (
              task.assigned_to && <span>{task.assigned_to}</span>
            )}
          </div>
          {canExpand && task.task_kind !== "active_workflow" && (
            <button
              type="button"
              className="home-task-expand"
              onClick={() => setExpanded((v) => !v)}
            >
              {displayText(expanded ? chrome.show_less : chrome.show_more)}
            </button>
          )}
          {expanded && canExpand && (
            <div className="home-task-details">
              {task.instructions && (
                <div className="home-task-detail-row">
                  <span className="home-task-detail-label">
                    {displayText(chrome.instructions_label)}:
                  </span>{" "}
                  <span>{task.instructions}</span>
                </div>
              )}
              {task.owner && (
                <div className="home-task-detail-row">
                  <span className="home-task-detail-label">
                    {displayText(chrome.owner_label)}:
                  </span>{" "}
                  <span>{task.owner}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {(showComplete || showContinue || showAccept) && (
          <div className="home-task-actions">
            {showAccept && (
              <Button size="small" type="primary" loading={accepting} onClick={() => onAccept?.(task)}>
                {displayText(chrome.claim_task)}
              </Button>
            )}
            {showComplete && (
              <Button size="small" type="primary" loading={completing} onClick={() => onComplete?.(task)}>
                {displayText(chrome.complete)}
              </Button>
            )}
            {showContinue && path && (
              <Link to={path}>
                <Button size="small" type="primary">
                  {displayText(chrome.continue)}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskGrid({
  tasks,
  chrome,
  onComplete,
  onAccept,
  completingId,
  acceptingId,
}: {
  tasks: TaskDashboardTaskItem[];
  chrome: TaskDashboardChrome;
  onComplete?: (task: TaskDashboardTaskItem) => void;
  onAccept?: (task: TaskDashboardTaskItem) => void;
  completingId?: string | null;
  acceptingId?: string | null;
}) {
  const requiredLabel = displayText(chrome.required);
  const columns: ColumnsType<TaskDashboardTaskItem> = [
    {
      title: displayText(chrome.column_task_name),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_value, task) => {
        const contentLabel = contentLinkLabel(task);
        const path = task.record_detail_href;
        return (
          <div className="home-grid-name">
            <span className="home-task-name">{task.name}</span>
            {contentLabel && (
              <>
                <span className="home-task-separator"> </span>
                {path ? (
                  <Link to={path} className="home-task-content-link">
                    {contentLabel}
                  </Link>
                ) : (
                  <span>{contentLabel}</span>
                )}
              </>
            )}
            {task.required && (
              <span className="home-task-required" title={requiredLabel} aria-label={requiredLabel}>
                *
              </span>
            )}
            {task.task_kind === "active_workflow" && task.workflow_version && task.workflow_version > 0 && (
              <span className="home-task-separator">
                {" "}
                · {displayText(defaultWorkflowChrome.timeline_version)} {task.workflow_version}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: displayText(chrome.column_task_due_date),
      dataIndex: "due_date",
      key: "due_date",
      width: 150,
      sorter: (a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""),
      render: (value: string | undefined) => formatDate(value) || "—",
    },
    {
      title: displayText(chrome.column_task_assignment_date),
      key: "assignment_date",
      width: 170,
      sorter: (a, b) =>
        (a.first_assigned_date ?? a.title_timestamp ?? "").localeCompare(
          b.first_assigned_date ?? b.title_timestamp ?? "",
        ),
      render: (_value, task) =>
        formatDate(task.first_assigned_date ?? task.title_timestamp) || "—",
    },
    {
      title: displayText(chrome.column_workflow_owner),
      dataIndex: "owner",
      key: "owner",
      width: 160,
      sorter: (a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""),
      render: (value: string | undefined) => value || "—",
    },
    {
      title: displayText(chrome.content_count),
      dataIndex: "content_count",
      key: "content_count",
      width: 130,
      sorter: (a, b) => (a.content_count ?? 0) - (b.content_count ?? 0),
      render: (value: number | undefined) => {
        const n = value ?? 0;
        if (n >= 2) return displayText(chrome.content_count_multiple);
        return displayText(chrome.content_count_single);
      },
    },
    {
      title: displayText(chrome.column_actions),
      key: "actions",
      width: 120,
      render: (_value, task) => {
        const showComplete =
          task.can_complete &&
          ((task.task_kind === "user_task" && task.complete_action && task.object_api_name && task.record_id) ||
            (task.task_kind === "workflow_task" &&
              task.complete_action === "workflow_complete" &&
              Boolean(task.workflow_task_id)));
        const showContinue = Boolean(task.can_continue && task.record_detail_href);
        const showAccept = Boolean(task.can_accept && task.workflow_task_id);
        if (!showComplete && !showContinue && !showAccept) return null;
        return (
          <div className="home-grid-actions">
            {showAccept && (
              <Button
                size="small"
                type="primary"
                loading={acceptingId === task.task_id}
                onClick={() => onAccept?.(task)}
              >
                {displayText(chrome.claim_task)}
              </Button>
            )}
            {showComplete && (
              <Button
                size="small"
                type="primary"
                loading={completingId === task.task_id}
                onClick={() => onComplete?.(task)}
              >
                {displayText(chrome.complete)}
              </Button>
            )}
            {showContinue && task.record_detail_href && (
              <Link to={task.record_detail_href}>
                <Button size="small" type="primary">
                  {displayText(chrome.continue)}
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Table
      className="home-task-grid"
      rowKey="task_id"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={tasks}
    />
  );
}

export function TaskDashboardPage() {
  const vaultId = useVaultId();
  const { session } = useAuth();
  const { shell } = useUi();
  const { displayName, avatarUrl } = useHeaderUserIdentity(vaultId, session?.username);
  const [view, setView] = useState<TaskView>("all_tasks");
  const [layout, setLayout] = useState<LayoutMode>("detail");
  const [model, setModel] = useState<TaskDashboardModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const completingRef = useRef<string | null>(null);
  const [workflowComplete, setWorkflowComplete] = useState<{
    page: RecordPageModel | null;
    task: WorkflowTaskAction;
  } | null>(null);
  const [workflowSignature, setWorkflowSignature] = useState<{
    page: RecordPageModel;
    task: WorkflowTaskAction;
  } | null>(null);
  const [filters, setFilters] = useState<HomeFiltersState>(emptyFilters);
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    content_type: true,
  });

  const chrome = useMemo(
    () => ({ ...defaultTaskDashboardChrome, ...(model?.chrome ?? {}) }),
    [model?.chrome],
  );

  const duePresetOptions = useMemo(
    () =>
      duePresetValues.map((value) => ({
        value,
        label: displayText(
          value === "overdue"
            ? chrome.overdue
            : value === "due_today"
              ? chrome.due_today
              : value === "next_7_days"
                ? chrome.next_7_days
                : chrome.no_due_date,
        ),
      })),
    [chrome],
  );

  const ownerScopeOptions = useMemo(
    () =>
      ownerScopeValues.map((value) => ({
        value,
        label: displayText(value === "me" ? chrome.assigned_to_you : chrome.unassigned),
      })),
    [chrome],
  );

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.taskDashboard(vaultId, {
        view,
        pageSize: PAGE_SIZE,
        contentType: filters.contentTypes,
        due: filters.duePresets,
        dueFrom: filters.dueFrom || undefined,
        dueTo: filters.dueTo || undefined,
        owner: filters.ownerScopes,
        assignedFrom: filters.assignedFrom || undefined,
        assignedTo: filters.assignedTo || undefined,
        workflow: filters.workflows,
        contentCount: filters.contentCounts,
      });
      setModel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(defaultTaskDashboardChrome.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, view, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const openWorkflowComplete = useCallback(
    async (task: TaskDashboardTaskItem) => {
      if (!vaultId || !task.workflow_task_id || !task.can_complete) {
        return;
      }
      const fromDashboard = workflowTaskActionFromDashboard(task);
      if (fromDashboard && !taskHasSignatureRequirement(fromDashboard)) {
        setWorkflowComplete({ page: null, task: fromDashboard });
        return;
      }
      if (!task.object_api_name || !task.record_id) {
        return;
      }
      setCompletingId(task.task_id);
      setError(null);
      try {
        const page = await api.recordPage(vaultId, task.object_api_name, task.record_id);
        const wfTask =
          page.workflow_tasks?.find((item) => item.workflow_task_id === task.workflow_task_id) ??
          null;
        if (!wfTask?.can_complete) {
          throw new Error(displayText(defaultWorkflowChrome.complete_failed));
        }
        if (taskHasSignatureRequirement(wfTask)) {
          setWorkflowSignature({ page, task: wfTask });
        } else {
          setWorkflowComplete({ page, task: wfTask });
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : displayText(defaultTaskDashboardChrome.open_complete_failed),
        );
      } finally {
        setCompletingId(null);
      }
    },
    [vaultId],
  );

  const completeTask = useCallback(
    async (task: TaskDashboardTaskItem) => {
      if (!vaultId || !task.can_complete) return;
      if (completingRef.current === task.task_id) return;
      if (task.task_kind === "workflow_task") {
        await openWorkflowComplete(task);
        return;
      }
      if (!task.object_api_name || !task.record_id) return;
      completingRef.current = task.task_id;
      setCompletingId(task.task_id);
      setError(null);
      try {
        await api.completeUserTask(vaultId, task.object_api_name, task.record_id);
        setModel((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.filter((item) => item.task_id !== task.task_id),
                total_count: Math.max(0, prev.total_count - 1),
              }
            : prev,
        );
        await load();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : displayText(defaultTaskDashboardChrome.complete_failed),
        );
      } finally {
        completingRef.current = null;
        setCompletingId(null);
      }
    },
    [vaultId, load, openWorkflowComplete],
  );

  const submitWorkflowComplete = useCallback(
    async (verdictLabel: string, comment: string, fields: Record<string, string>) => {
      if (!vaultId || !workflowComplete) return;
      const { page, task } = workflowComplete;
      if (!task.workflow_task_id) return;
      if (!page) {
        await api.completeHomeWorkflowTask(vaultId, task.workflow_task_id, {
          verdict_label: verdictLabel,
          comment,
          fields,
        });
      } else {
        await api.workflowComplete(vaultId, page.object_api_name, page.record_id, {
          workflow_task_id: task.workflow_task_id,
          verdict_label: verdictLabel,
          comment,
          fields,
          action_guard: {
            schema_fingerprint: page.schema_fingerprint,
            ui_fingerprint: page.ui_fingerprint,
            record_version: page.record_version,
          },
          layout: page.selected_layout.api_name,
        });
      }
      setWorkflowComplete(null);
      await load();
    },
    [vaultId, workflowComplete, load],
  );

  const acceptWorkflowTask = useCallback(
    async (task: TaskDashboardTaskItem) => {
      if (!vaultId || !task.workflow_task_id || !task.can_accept) return;
      setAcceptingId(task.task_id);
      setError(null);
      try {
        await api.claimHomeWorkflowTask(vaultId, task.workflow_task_id);
        await load();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : displayText(defaultTaskDashboardChrome.accept_failed),
        );
      } finally {
        setAcceptingId(null);
      }
    },
    [vaultId, load],
  );

  const selectedViewLabel = displayText(chrome[view]);
  const tasks = model?.tasks ?? [];
  const total = model?.total_count ?? 0;
  const userLabel = displayName || session?.username || displayText(chrome.current_user);
  const rangeLabel = !model
    ? ""
    : tasks.length > 0
      ? displayTextTemplate(chrome.range_text, { start: 1, end: tasks.length, total })
      : displayTextTemplate(chrome.range_empty, { total });
  const workflowChrome = {
    ...defaultWorkflowChrome,
    ...(workflowComplete?.page?.workflow ?? workflowSignature?.page.workflow ?? {}),
  };

  if (!vaultId) {
    return null;
  }

  return (
    <div className="home-page">
      <aside className="home-sidebar">
        <div className="home-user-panel">
          <UserAvatar
            vaultId={vaultId}
            imageUrl={avatarUrl}
            alt={userLabel}
            className="home-user-avatar"
          />
          <div className="home-user-name">{userLabel}</div>
        </div>

        <section className="home-sidebar-section">
          <div className="home-sidebar-heading">
            <RightOutlined />
            <span>{displayText(chrome.views_heading)}</span>
            <EditOutlined />
          </div>
          <div className="home-view-list">
            {viewOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`home-view-item${view === option.key ? " active" : ""}`}
                onClick={() => setView(option.key)}
              >
                <span className="home-view-label">
                  {option.icon}
                  {displayText(chrome[option.labelKey])}
                </span>
                <span className="home-view-count">{countForView(model, option.key)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-sidebar-section">
          <div className="home-sidebar-heading">
            <RightOutlined />
            <span>{displayText(chrome.filters_heading)}</span>
            {filtersActive(filters) ? (
              <button
                type="button"
                className="home-filter-clear"
                onClick={() => setFilters(emptyFilters)}
              >
                {displayText(chrome.clear_filters)}
              </button>
            ) : (
              <EditOutlined />
            )}
          </div>

          <FilterGroup
            title={displayText(chrome.content_type)}
            expanded={Boolean(expandedFilters.content_type)}
            onToggle={() =>
              setExpandedFilters((prev) => ({ ...prev, content_type: !prev.content_type }))
            }
          >
            {(model?.filter_facets?.content_types ?? []).length === 0 ? (
              <div className="home-filter-empty">{displayText(chrome.no_content_types)}</div>
            ) : (
              (model?.filter_facets?.content_types ?? []).map((opt) => (
                <label key={opt.value} className="home-filter-option">
                  <input
                    type="checkbox"
                    checked={filters.contentTypes.includes(opt.value)}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        contentTypes: toggleValue(prev.contentTypes, opt.value),
                      }))
                    }
                  />
                  <span className="home-filter-option-label">{opt.label}</span>
                  <span className="home-filter-option-count">{opt.count}</span>
                </label>
              ))
            )}
          </FilterGroup>

          <FilterGroup
            title={displayText(chrome.task_owner)}
            expanded={Boolean(expandedFilters.owner)}
            onToggle={() => setExpandedFilters((prev) => ({ ...prev, owner: !prev.owner }))}
          >
            {ownerScopeOptions.map((opt) => (
              <label key={opt.value} className="home-filter-option">
                <input
                  type="checkbox"
                  checked={filters.ownerScopes.includes(opt.value)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      ownerScopes: toggleValue(prev.ownerScopes, opt.value),
                    }))
                  }
                />
                <span className="home-filter-option-label">{opt.label}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup
            title={displayText(chrome.task_due_date)}
            expanded={Boolean(expandedFilters.due)}
            onToggle={() => setExpandedFilters((prev) => ({ ...prev, due: !prev.due }))}
          >
            {duePresetOptions.map((opt) => (
              <label key={opt.value} className="home-filter-option">
                <input
                  type="checkbox"
                  checked={filters.duePresets.includes(opt.value)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      duePresets: toggleValue(prev.duePresets, opt.value),
                    }))
                  }
                />
                <span className="home-filter-option-label">{opt.label}</span>
              </label>
            ))}
            <div className="home-filter-date-row">
              <input
                type="date"
                value={filters.dueFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dueFrom: e.target.value }))}
                aria-label={displayText(chrome.due_date_from_aria)}
              />
              <span>–</span>
              <input
                type="date"
                value={filters.dueTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dueTo: e.target.value }))}
                aria-label={displayText(chrome.due_date_to_aria)}
              />
            </div>
          </FilterGroup>

          <FilterGroup
            title={displayText(chrome.task_assignment_date)}
            expanded={Boolean(expandedFilters.assigned)}
            onToggle={() => setExpandedFilters((prev) => ({ ...prev, assigned: !prev.assigned }))}
          >
            <div className="home-filter-date-row">
              <input
                type="date"
                value={filters.assignedFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, assignedFrom: e.target.value }))}
                aria-label={displayText(chrome.assignment_date_from_aria)}
              />
              <span>–</span>
              <input
                type="date"
                value={filters.assignedTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, assignedTo: e.target.value }))}
                aria-label={displayText(chrome.assignment_date_to_aria)}
              />
            </div>
          </FilterGroup>

          <FilterGroup
            title={displayText(chrome.workflow)}
            expanded={Boolean(expandedFilters.workflow)}
            onToggle={() => setExpandedFilters((prev) => ({ ...prev, workflow: !prev.workflow }))}
          >
            {(model?.filter_facets?.workflows ?? []).length === 0 ? (
              <div className="home-filter-empty">{displayText(chrome.no_workflows)}</div>
            ) : (
              (model?.filter_facets?.workflows ?? []).map((opt) => (
                <label key={opt.value} className="home-filter-option">
                  <input
                    type="checkbox"
                    checked={filters.workflows.includes(opt.value)}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        workflows: toggleValue(prev.workflows, opt.value),
                      }))
                    }
                  />
                  <span className="home-filter-option-label">{opt.label}</span>
                  <span className="home-filter-option-count">{opt.count}</span>
                </label>
              ))
            )}
          </FilterGroup>

          <FilterGroup
            title={displayText(chrome.content_count)}
            expanded={Boolean(expandedFilters.content_count)}
            onToggle={() =>
              setExpandedFilters((prev) => ({
                ...prev,
                content_count: !prev.content_count,
              }))
            }
          >
            {(model?.filter_facets?.content_counts ?? []).length === 0 ? (
              <div className="home-filter-empty">{displayText(chrome.no_content_counts)}</div>
            ) : (
              (model?.filter_facets?.content_counts ?? []).map((opt) => (
                <label key={opt.value} className="home-filter-option">
                  <input
                    type="checkbox"
                    checked={filters.contentCounts.includes(opt.value)}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        contentCounts: toggleValue(prev.contentCounts, opt.value),
                      }))
                    }
                  />
                  <span className="home-filter-option-label">{opt.label}</span>
                  <span className="home-filter-option-count">{opt.count}</span>
                </label>
              ))
            )}
          </FilterGroup>
        </section>
      </aside>

      <main className="home-content">
        <div className="home-titlebar">
          <div>
            <h1>{selectedViewLabel}</h1>
            <Button size="small" disabled>
              {displayText(chrome.save_view_as)}
            </Button>
          </div>
          <div className="home-range">
            {rangeLabel}
            <div className="home-layout-toggle" role="group" aria-label={displayText(chrome.layout_aria)}>
              <button
                type="button"
                className={layout === "detail" ? "active" : undefined}
                title={displayText(chrome.detail_view)}
                aria-pressed={layout === "detail"}
                onClick={() => setLayout("detail")}
              >
                <AppstoreOutlined />
              </button>
              <button
                type="button"
                className={layout === "grid" ? "active" : undefined}
                title={displayText(chrome.grid_view)}
                aria-pressed={layout === "grid"}
                onClick={() => setLayout("grid")}
              >
                <TableOutlined />
              </button>
            </div>
            <FileTextOutlined />
          </div>
        </div>

        {layout === "detail" && (
          <div className="home-sortbar">
            <ClockCircleOutlined />
            <span>{displayText(chrome.sort_due_date)}</span>
          </div>
        )}

        {error && (
          <Alert
            className="home-alert"
            type="error"
            showIcon
            title={displayText(chrome.load_failed)}
            description={error}
          />
        )}

        {loading ? (
          <div className="home-loading">
            <Spin description={displayText(shell.loading)} />
          </div>
        ) : tasks.length ? (
          layout === "grid" ? (
            <TaskGrid
              tasks={tasks}
              chrome={chrome}
              onComplete={completeTask}
              onAccept={acceptWorkflowTask}
              completingId={completingId}
              acceptingId={acceptingId}
            />
          ) : (
            <div className="home-task-list">
              {tasks.map((task) => (
                <TaskRow
                  key={task.task_id}
                  task={task}
                  chrome={chrome}
                  onComplete={completeTask}
                  onAccept={acceptWorkflowTask}
                  completing={completingId === task.task_id}
                  accepting={acceptingId === task.task_id}
                />
              ))}
            </div>
          )
        ) : (
          !error && (
            <div className="home-empty">
              <InboxOutlined />
              <span>{displayText(shell.empty_no_records)}</span>
            </div>
          )
        )}
      </main>

      {workflowComplete && (
        <TaskCompleteModal
          task={workflowComplete.task}
          workflow={workflowChrome}
          onClose={() => setWorkflowComplete(null)}
          onSubmit={submitWorkflowComplete}
        />
      )}

      {workflowSignature && (
        <SignatureModal
          vaultId={vaultId}
          objectName={workflowSignature.page.object_api_name}
          recordId={workflowSignature.page.record_id}
          task={workflowSignature.task}
          page={workflowSignature.page}
          workflow={workflowChrome}
          onClose={() => setWorkflowSignature(null)}
          onSuccess={async () => {
            setWorkflowSignature(null);
            await load();
          }}
          onError={(message) => setError(message)}
        />
      )}
    </div>
  );
}
