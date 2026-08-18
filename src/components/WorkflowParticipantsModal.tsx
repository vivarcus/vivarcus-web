import { Empty, Modal, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { WorkflowParticipantsModel } from "../api/types";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText, formatFieldDisplayValue, type WorkflowChrome } from "../lib/i18n";
import type { DisplayContext } from "../lib/i18n/types";

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  participants: WorkflowParticipantsModel | null;
  workflowLabel?: string;
  workflow?: WorkflowChrome;
  displayContext: DisplayContext;
  onClose: () => void;
};

type RelatedTaskRow = NonNullable<
  WorkflowParticipantsModel["groups"][number]["related_tasks"]
>[number];

type ParticipantTableRow = {
  key: string;
  group_name: string;
  group_label?: string;
  participant_type: string;
  user_id?: string;
  display_name?: string;
  added_at?: string;
  related_tasks: RelatedTaskRow[];
  related_summary?: WorkflowParticipantsModel["groups"][number]["related_summary"];
  groupRowSpan: number;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  groupIndex: number;
};

function relatedTaskStatusLabel(status: string | undefined, workflow: WorkflowChrome): string {
  switch ((status ?? "").trim()) {
    case "completed":
      return displayText(workflow.participants_task_status_completed);
    case "potential":
      return displayText(workflow.participants_task_status_potential);
    case "active":
    default:
      return displayText(workflow.participants_task_status_active);
  }
}

function relatedSummaryText(
  summary: ParticipantTableRow["related_summary"] | undefined,
  workflow: WorkflowChrome,
): string | null {
  if (!summary) {
    return null;
  }
  const parts: string[] = [];
  if (summary.completed > 0) {
    parts.push(`${displayText(workflow.participants_task_status_completed)} ${summary.completed}`);
  }
  if (summary.active > 0) {
    parts.push(`${displayText(workflow.participants_task_status_active)} ${summary.active}`);
  }
  if (summary.potential > 0) {
    parts.push(`${displayText(workflow.participants_task_status_potential)} ${summary.potential}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function groupTitle(group: Pick<ParticipantTableRow, "group_label" | "group_name">) {
  return group.group_label?.trim() || group.group_name;
}

function buildParticipantRows(participants: WorkflowParticipantsModel | null): ParticipantTableRow[] {
  if (!participants?.groups.length) {
    return [];
  }

  const rows: ParticipantTableRow[] = [];
  let groupIndex = 0;
  for (const group of participants.groups) {
    groupIndex += 1;
    const members =
      group.members.length > 0
        ? group.members
        : [{ user_id: "", display_name: undefined, added_at: undefined }];
    const relatedTasks = group.related_tasks ?? [];
    const relatedSummary = group.related_summary;

    members.forEach((member, index) => {
      rows.push({
        key: `${group.group_name}:${member.user_id || index}`,
        group_name: group.group_name,
        group_label: group.group_label,
        participant_type: group.participant_type,
        user_id: member.user_id,
        display_name: member.display_name,
        added_at: member.added_at,
        related_tasks: relatedTasks,
        related_summary: relatedSummary,
        groupRowSpan: index === 0 ? members.length : 0,
        isGroupStart: index === 0,
        isGroupEnd: index === members.length - 1,
        groupIndex,
      });
    });
  }
  return rows;
}

function participantStats(participants: WorkflowParticipantsModel | null) {
  if (!participants?.groups.length) {
    return { groups: 0, members: 0 };
  }
  return {
    groups: participants.groups.length,
    members: participants.groups.reduce((total, group) => total + Math.max(group.members.length, 1), 0),
  };
}

function memberCellClass(row: ParticipantTableRow) {
  return row.isGroupEnd ? undefined : "wf-participants-modal__cell--continued";
}

function ColumnHeader({ label }: { label: string }) {
  return (
    <span className="data-table__header-cell">
      <span className="data-table__header-label">{label}</span>
    </span>
  );
}

function EmptyCell({ children }: { children: ReactNode }) {
  return <span className="field-value field-value--empty">{children}</span>;
}

export function WorkflowParticipantsModal({
  open,
  loading,
  error,
  participants,
  workflowLabel,
  workflow: workflowProp,
  displayContext,
  onClose,
}: Props) {
  const { shell } = useUi();
  const workflow = useMemo(
    () => ({ ...defaultWorkflowChrome, ...workflowProp }),
    [workflowProp],
  );
  const formatDateTime = (value?: string) =>
    formatFieldDisplayValue(value, "DateTime", displayContext);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setExpandedRowKeys([]);
    }
  }, [open]);

  const tableRows = useMemo(() => buildParticipantRows(participants), [participants]);
  const stats = useMemo(() => participantStats(participants), [participants]);
  const emptyValue = displayText(shell.empty_value);

  const toggleTasks = (rowKey: string) => {
    setExpandedRowKeys((current) =>
      current.includes(rowKey) ? current.filter((key) => key !== rowKey) : [...current, rowKey],
    );
  };

  const columns = useMemo<ColumnsType<ParticipantTableRow>>(
    () => [
      {
        title: <ColumnHeader label={displayText(workflow.participants_group_column)} />,
        key: "group",
        width: 196,
        onCell: (row) => ({
          rowSpan: row.groupRowSpan,
          className: row.groupRowSpan > 0 ? "data-table__group-cell" : undefined,
        }),
        render: (_, row) => <span>{groupTitle(row)}</span>,
      },
      {
        title: <ColumnHeader label={displayText(workflow.participants_type_column)} />,
        key: "type",
        width: 148,
        onCell: (row) => ({
          rowSpan: row.groupRowSpan,
          className: row.groupRowSpan > 0 ? "data-table__group-cell" : undefined,
        }),
        render: (_, row) =>
          row.participant_type ? <span>{row.participant_type}</span> : <EmptyCell>{emptyValue}</EmptyCell>,
      },
      {
        title: <ColumnHeader label={displayText(workflow.participants_user_column)} />,
        key: "user",
        onCell: (row) => ({ className: memberCellClass(row) }),
        render: (_, row) => {
          const label = row.display_name || row.user_id;
          if (!label) {
            return <EmptyCell>{displayText(workflow.timeline_unassigned)}</EmptyCell>;
          }
          return <span>{label}</span>;
        },
      },
      {
        title: <ColumnHeader label={displayText(workflow.participants_added_column)} />,
        key: "added_at",
        width: 168,
        onCell: (row) => ({ className: memberCellClass(row) }),
        render: (_, row) => {
          const formatted = formatDateTime(row.added_at);
          return formatted ? <span>{formatted}</span> : <EmptyCell>{emptyValue}</EmptyCell>;
        },
      },
      {
        title: <ColumnHeader label={displayText(workflow.participants_related_tasks)} />,
        key: "related_tasks",
        width: 140,
        className: "data-table__actions-col",
        onCell: (row) => ({
          rowSpan: row.groupRowSpan,
          className: row.groupRowSpan > 0 ? "data-table__group-cell data-table__actions-col" : undefined,
        }),
        render: (_, row) => {
          if (row.related_tasks.length === 0) {
            return <EmptyCell>{emptyValue}</EmptyCell>;
          }
          const expanded = expandedRowKeys.includes(row.key);
          const summary = relatedSummaryText(row.related_summary, workflow);
          return (
            <div className="wf-participants-modal__related-tasks-cell">
              <button
                type="button"
                className="field-value field-value--link wf-participants-modal__view-tasks"
                aria-expanded={expanded}
                onClick={() => toggleTasks(row.key)}
              >
                {displayText(workflow.participants_view_tasks)}
              </button>
              {summary ? (
                <div className="wf-participants-modal__related-summary">{summary}</div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [displayContext, emptyValue, expandedRowKeys, workflow],
  );

  const relatedTaskColumns = useMemo<ColumnsType<RelatedTaskRow>>(
    () => [
      {
        title: <ColumnHeader label={displayText(workflow.participants_related_tasks)} />,
        key: "task",
        render: (_, task) => <span>{task.task_label || task.task_api_name}</span>,
      },
      {
        title: <ColumnHeader label={displayText(workflow.participants_task_status_column)} />,
        key: "status",
        width: 120,
        render: (_, task) => <span>{relatedTaskStatusLabel(task.status, workflow)}</span>,
      },
    ],
    [workflow],
  );

  const modalTitle = (
    <div className="wf-participants-modal__title">
      <span>{displayText(workflow.timeline_view_participants)}</span>
      {workflowLabel ? <span className="wf-participants-modal__subtitle">{workflowLabel}</span> : null}
    </div>
  );

  return (
    <Modal
      open={open}
      title={modalTitle}
      footer={null}
      width={940}
      className="wf-participants-modal"
      onCancel={onClose}
    >
      {loading ? (
        <div className="wf-participants-modal__loading">
          <Spin />
          <span>{displayText(workflow.participants_loading)}</span>
        </div>
      ) : error ? (
        <p className="workflow-task__error">{error}</p>
      ) : tableRows.length > 0 ? (
        <>
          <div className="wf-participants-modal__toolbar">
            <span className="list-header__record-count">
              {displayText(workflow.participants_group_column)}: {stats.groups} ·{" "}
              {displayText(workflow.participants_user_column)}: {stats.members}
            </span>
          </div>
          <div className="table-wrap table-wrap--wrap-cells wf-participants-modal__table-wrap">
            <Table
              size="small"
              pagination={false}
              className="data-table"
              rowKey="key"
              dataSource={tableRows}
              columns={columns}
              tableLayout="auto"
              locale={{
                emptyText: (
                  <span className="data-table__empty">{displayText(workflow.empty_timeline)}</span>
                ),
              }}
              expandable={{
                showExpandColumn: false,
                expandedRowKeys,
                onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
                rowExpandable: (row) => row.isGroupStart && row.related_tasks.length > 0,
                expandedRowRender: (row) => (
                  <div className="table-wrap table-wrap--wrap-cells wf-participants-modal__nested-wrap">
                    <Table
                      size="small"
                      pagination={false}
                      className="data-table"
                      rowKey={(task) => task.workflow_task_id || task.task_api_name}
                      dataSource={row.related_tasks}
                      columns={relatedTaskColumns}
                    />
                  </div>
                ),
              }}
            />
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={displayText(workflow.empty_timeline)} />
      )}
    </Modal>
  );
}
