import { Alert, Button, Spin, Tag, message } from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { JobStatusBoard, JobStatusInstance } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { AdminRowActionMenu } from "../components/admin/AdminRowActionMenu";
import { adminEllipsisCell, adminFirstColumnCell } from "../components/admin/adminTableCells";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";
import type { OperationsChrome } from "../lib/i18n/chromeTypes";

function jobRowHasActions(row: JobStatusInstance): boolean {
  return (
    row.can_start_now ||
    row.can_cancel ||
    row.can_download_log ||
    row.can_make_inactive ||
    Boolean(row.job_definition)
  );
}

function jobInstanceStatusLabel(label: string, operations: OperationsChrome): string {
  const map: Record<string, string> = {
    Scheduled: displayText(operations.scheduled),
    Queueing: displayText(operations.queueing),
    Queued: displayText(operations.queued),
    Running: displayText(operations.running),
    Success: displayText(operations.success),
    Failed: displayText(operations.failed),
    Cancelled: displayText(operations.cancelled),
    "Errors Encountered": displayText(operations.errors_encountered),
    "Missed Schedule": displayText(operations.missed_schedule),
    "Failed to Run": displayText(operations.failed_to_run),
    "Completed due to Inactivity": displayText(operations.completed_due_to_inactivity),
    Timeout: "Timeout",
  };
  return map[label] ?? label;
}

function definitionPath(apiName: string): string {
  return `/admin/operations/job_definitions/${encodeURIComponent(apiName)}`;
}

export function AdminJobStatusPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const operations = shell.operations;
  const [board, setBoard] = useState<JobStatusBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.jobStatusBoard(vaultId);
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNow = async (id: string) => {
    if (!vaultId) return;
    setActingId(id);
    try {
      await api.startJobNow(vaultId, id);
      message.success(displayText(operations.started));
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setActingId(null);
    }
  };

  const cancel = async (id: string) => {
    if (!vaultId) return;
    setActingId(id);
    try {
      await api.cancelJobInstance(vaultId, id);
      message.success(displayText(operations.cancelled));
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setActingId(null);
    }
  };

  const downloadLog = async (id: string) => {
    if (!vaultId) return;
    setActingId(id);
    try {
      const blob = await api.downloadJobLog(vaultId, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setActingId(null);
    }
  };

  const makeInactive = async (id: string) => {
    if (!vaultId) return;
    setActingId(id);
    try {
      await api.makeJobInactive(vaultId, id);
      message.success(displayText(operations.make_job_inactive));
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setActingId(null);
    }
  };

  const renderRowActionMenu = (row: JobStatusInstance) => {
    if (!jobRowHasActions(row)) return null;
    const items: MenuProps["items"] = [
      row.can_start_now
        ? {
            key: "start",
            label: displayText(operations.start_now),
            disabled: actingId === row.id,
            onClick: () => void startNow(row.id),
          }
        : null,
      row.can_cancel
        ? {
            key: "cancel",
            label: displayText(shell.cancel),
            danger: true,
            disabled: actingId === row.id,
            onClick: () => void cancel(row.id),
          }
        : null,
      row.can_make_inactive
        ? {
            key: "make-inactive",
            label: displayText(operations.make_job_inactive),
            disabled: actingId === row.id,
            onClick: () => void makeInactive(row.id),
          }
        : null,
      row.can_download_log
        ? {
            key: "download-log",
            label: displayText(operations.download_log),
            disabled: actingId === row.id,
            onClick: () => void downloadLog(row.id),
          }
        : null,
      row.job_definition
        ? {
            key: "view-definition",
            label: displayText(operations.view_job_definition),
            onClick: () => navigate(definitionPath(row.job_definition!)),
          }
        : null,
    ].filter(Boolean) as MenuProps["items"];
    return <AdminRowActionMenu items={items} loading={actingId === row.id} />;
  };

  const buildColumns = (history: boolean): TableColumnsType<JobStatusInstance> => [
    {
      title: displayText(operations.job_title),
      dataIndex: "job_title",
      ellipsis: true,
      render: (value: string | undefined, row) =>
        adminFirstColumnCell(value, adminEllipsisCell(value), renderRowActionMenu(row)),
    },
    {
      title: displayText(operations.job_id),
      dataIndex: "id",
      ellipsis: true,
      width: 280,
      render: (id: string, row) => {
        const label = row.job_definition_version ? `${id} (${row.job_definition_version})` : id;
        if (row.job_definition) {
          return (
            <Link to={definitionPath(row.job_definition)}>{adminEllipsisCell(label)}</Link>
          );
        }
        return adminEllipsisCell(id);
      },
    },
    ...(history
      ? [
          { title: displayText(operations.started_time), dataIndex: "started_at" },
          { title: displayText(operations.completion_time), dataIndex: "completed_at" },
        ]
      : [{ title: displayText(operations.scheduled_start_time), dataIndex: "scheduled_at" }]),
    {
      title: displayText(operations.job_status),
      dataIndex: "status_label",
      width: 140,
      render: (label: string) => <Tag>{jobInstanceStatusLabel(label, operations)}</Tag>,
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell
      title={displayText(operations.job_status_title)}
      actions={<Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>}
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        {board && (
          <>
            <AdminPageSection title={displayText(operations.scheduled)}>
              <AdminCompactTable<JobStatusInstance>
                loadingOverlay={loading}
                rowKey="id"
                dataSource={board.scheduled}
                locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
                columns={buildColumns(false)}
              />
            </AdminPageSection>
            <AdminPageSection title={displayText(operations.running)}>
              <AdminCompactTable<JobStatusInstance>
                loadingOverlay={loading}
                rowKey="id"
                dataSource={board.running}
                locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
                columns={buildColumns(false)}
              />
            </AdminPageSection>
            <AdminPageSection title={displayText(operations.history)}>
              <AdminCompactTable<JobStatusInstance>
                loadingOverlay={loading}
                rowKey="id"
                dataSource={board.history}
                locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
                columns={buildColumns(true)}
              />
            </AdminPageSection>
          </>
        )}
      </Spin>
    </AdminPageShell>
  );
}
