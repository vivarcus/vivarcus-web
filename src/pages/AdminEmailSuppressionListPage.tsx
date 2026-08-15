import { Alert, Button, Dropdown, Form, Input, Modal, Space, Spin } from "antd";
import type { MenuProps, TableProps } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState, type Key } from "react";
import { api } from "../api/client";
import type { EmailSuppressionItem, EmailSuppressionList } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { AdminRowActionMenu } from "../components/admin/AdminRowActionMenu";
import { adminEllipsisCell, adminFirstColumnCell } from "../components/admin/adminTableCells";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

function formatSuppressionDate(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return iso;
  return d.format("D MMM YYYY h:mm A");
}

export function AdminEmailSuppressionListPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [data, setData] = useState<EmailSuppressionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [removing, setRemoving] = useState(false);

  const query = useMemo(
    () => ({
      q: appliedQuery || undefined,
      limit: 100,
      offset: 0,
    }),
    [appliedQuery],
  );

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.listEmailSuppression(vaultId, query);
      setData(next);
      setSelectedKeys([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, query, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeIds = async (ids: string[]) => {
    if (!vaultId || ids.length === 0) return;
    setRemoving(true);
    setError(null);
    try {
      await api.deleteEmailSuppression(vaultId, ids);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setRemoving(false);
    }
  };

  const confirmRemove = (ids: string[], title: string) => {
    Modal.confirm({
      title,
      content:
        ids.length === 1
          ? "Remove this email address from the suppression list?"
          : `Remove ${ids.length} email addresses from the suppression list?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => removeIds(ids),
    });
  };

  const actionMenu: MenuProps = {
    items: [
      {
        key: "remove-multiple",
        label: "Remove Multiple Email Addresses from Suppression List",
        disabled: selectedKeys.length === 0 || removing,
        onClick: () =>
          confirmRemove(
            selectedKeys.map(String),
            "Remove Multiple Email Addresses from Suppression List",
          ),
      },
    ],
  };

  const columns: TableProps<EmailSuppressionItem>["columns"] = [
    {
      title: displayText(shell.metadata_lifecycle_name),
      dataIndex: "name",
      width: 140,
      ellipsis: true,
      render: (value: string | undefined, row) =>
        adminFirstColumnCell(
          value,
          adminEllipsisCell(value),
          <AdminRowActionMenu
            items={[
              {
                key: "remove",
                label: "Remove from Suppression List",
                disabled: removing,
                onClick: () => confirmRemove([row.id], "Remove from Suppression List"),
              },
            ]}
          />,
        ),
    },
    { title: "Email Address", dataIndex: "email_address", ellipsis: true },
    { title: "Suppression Reason", dataIndex: "suppression_reason", ellipsis: true },
    {
      title: "Suppression Date",
      dataIndex: "suppression_date",
      width: 200,
      render: (v: string) => formatSuppressionDate(v),
    },
  ];

  if (!vaultId) return null;

  const total = data?.total ?? 0;

  return (
    <AdminPageShell
      title="Email Suppression List"
      meta={
        <p className="page-header__meta">
          Use this page to view suppressed email addresses that Vault will not send emails to
        </p>
      }
      actions={
        <Space>
          <Dropdown menu={actionMenu}>
            <Button>Actions</Button>
          </Dropdown>
          <Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>
        </Space>
      }
    >
      <Form
        className="filter-bar"
        layout="inline"
        requiredMark={false}
        onFinish={() => setAppliedQuery(draftQuery)}
      >
        <Form.Item label="Search">
          <Input
            allowClear
            className="filter-bar__max-280"
            placeholder="Name, email, or reason (exact)"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            onPressEnter={() => setAppliedQuery(draftQuery)}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Apply
          </Button>
        </Form.Item>
      </Form>

      {error ? <Alert type="error" showIcon title={error} className="admin-page__banner" /> : null}

      <p className="admin-page__summary">
        {total} result{total === 1 ? "" : "s"}
      </p>

      <Spin spinning={loading}>
        <AdminCompactTable<EmailSuppressionItem>
          loadingOverlay={loading}
          rowKey="id"
          dataSource={data?.items ?? []}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
          columns={columns}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
        />
      </Spin>
    </AdminPageShell>
  );
}
