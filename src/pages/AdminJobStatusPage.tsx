import { Alert, Button, Spin, Tag, message } from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import { useCallback, useEffect, useState } from "react";
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

function jobRowHasActions(row: JobStatusInstance): boolean {
  return row.can_start_now || row.can_cancel;
}

export function AdminJobStatusPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
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
      message.success("Started");
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
      message.success("Cancelled");
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
            label: "Start Now",
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
    ].filter(Boolean) as MenuProps["items"];
    return <AdminRowActionMenu items={items} loading={actingId === row.id} />;
  };

  const buildColumns = (history: boolean): TableColumnsType<JobStatusInstance> => [
    {
      title: "Job Title",
      dataIndex: "job_title",
      ellipsis: true,
      render: (value: string | undefined, row) =>
        adminFirstColumnCell(value, adminEllipsisCell(value), renderRowActionMenu(row)),
    },
    { title: "Job ID", dataIndex: "id", ellipsis: true, width: 280 },
    ...(history
      ? [
          { title: "Started Time", dataIndex: "started_at" },
          { title: "Completion Time", dataIndex: "completed_at" },
        ]
      : [{ title: "Scheduled Start Time", dataIndex: "scheduled_at" }]),
    {
      title: "Job Status",
      dataIndex: "status_label",
      width: 120,
      render: (label: string) => <Tag>{label}</Tag>,
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell
      title="Job Status"
      actions={<Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>}
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        {board && (
          <>
            <AdminPageSection title="Scheduled">
              <AdminCompactTable<JobStatusInstance>
                loadingOverlay={loading}
                rowKey="id"
                dataSource={board.scheduled}
                locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
                columns={buildColumns(false)}
              />
            </AdminPageSection>
            <AdminPageSection title="Running">
              <AdminCompactTable<JobStatusInstance>
                loadingOverlay={loading}
                rowKey="id"
                dataSource={board.running}
                locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
                columns={buildColumns(false)}
              />
            </AdminPageSection>
            <AdminPageSection title="History">
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
