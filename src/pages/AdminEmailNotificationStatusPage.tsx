import { Alert, Button, DatePicker, Dropdown, Form, Input, Select, Space, Spin, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { EmailNotificationStatusItem, EmailNotificationStatusList } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { OperationsChrome } from "../lib/i18n/chromeTypes";

const STATUS_OPTIONS = [
  "Sent",
  "Delivered",
  "Failed",
  "Blocked",
  "Skipped",
  "Pending",
  "Summary",
  "Sent - Unknown",
] as const;

function toLocalInputValue(date: Date): Dayjs {
  return dayjs(date);
}

function defaultRange(): { from: Dayjs; to: Dayjs } {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from: toLocalInputValue(from), to: toLocalInputValue(to) };
}

function formatDisplayDate(value: Dayjs): string {
  return value.format("D MMM YYYY");
}

function formatSendDate(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return iso;
  return d.format("D MMM YYYY h:mm A");
}

function emailStatusLabel(status: string, operations: OperationsChrome): string {
  const map: Record<string, string> = {
    Sent: displayText(operations.email_status_sent),
    Delivered: displayText(operations.email_status_delivered),
    Failed: displayText(operations.email_status_failed),
    Blocked: displayText(operations.email_status_blocked),
    Skipped: displayText(operations.email_status_skipped),
    Pending: displayText(operations.email_status_pending),
    Summary: displayText(operations.email_status_summary),
    "Sent - Unknown": displayText(operations.email_status_sent_unknown),
  };
  return map[status] ?? status;
}

type DraftFilters = {
  from: Dayjs | null;
  to: Dayjs | null;
  email: string;
  status: string;
};

export function AdminEmailNotificationStatusPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const operations = shell.operations;
  const initial = useMemo(() => defaultRange(), []);
  const [draft, setDraft] = useState<DraftFilters>({
    from: initial.from,
    to: initial.to,
    email: "",
    status: "",
  });
  const [applied, setApplied] = useState<DraftFilters>(draft);
  const [data, setData] = useState<EmailNotificationStatusList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const query = useMemo(() => {
    return {
      send_from: applied.from?.toISOString(),
      send_to: applied.to?.toISOString(),
      email: applied.email.trim() || undefined,
      status: applied.status.trim() || undefined,
      limit: 100,
      offset: 0,
    };
  }, [applied]);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.listEmailNotificationStatus(vaultId, query);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, query, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    if (!vaultId) return;
    setExporting(true);
    try {
      const blob = await api.exportEmailNotificationStatus(vaultId, query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "email_notification_status.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: displayText(operations.send_date),
      dataIndex: "send_date",
      width: 200,
      render: (v: string) => formatSendDate(v),
    },
    { title: displayText(operations.recipient_name), dataIndex: "recipient_name", ellipsis: true },
    { title: displayText(operations.email_address), dataIndex: "email_address", ellipsis: true },
    {
      title: displayText(shell.metadata_status),
      dataIndex: "status",
      width: 140,
      render: (v: string) => <Tag>{emailStatusLabel(v, operations)}</Tag>,
    },
    { title: displayText(operations.error_message), dataIndex: "error_message", ellipsis: true },
    { title: displayText(operations.document_number), dataIndex: "document_number", ellipsis: true },
    {
      title: displayText(operations.object_record_name),
      dataIndex: "object_record_name",
      ellipsis: true,
    },
    { title: displayText(operations.subject), dataIndex: "subject", ellipsis: true },
  ];

  if (!vaultId) return null;

  const rangeFrom = applied.from ? formatDisplayDate(applied.from) : "";
  const rangeTo = applied.to ? formatDisplayDate(applied.to) : "";
  const total = data?.total ?? 0;

  return (
    <AdminPageShell
      title={displayText(operations.email_notification_status)}
      actions={
        <Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: "export",
                  label: displayText(operations.export_to_csv),
                  disabled: exporting,
                  onClick: () => void exportCsv(),
                },
              ],
            }}
          >
            <Button>{displayText(shell.domain_user.actions)}</Button>
          </Dropdown>
          <Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>
        </Space>
      }
    >
      <Form
        className="filter-bar"
        layout="inline"
        requiredMark={false}
        onFinish={() => setApplied({ ...draft })}
      >
        <Form.Item label={displayText(operations.send_date)}>
          <DatePicker.RangePicker
            showTime
            value={draft.from && draft.to ? [draft.from, draft.to] : null}
            onChange={(vals) =>
              setDraft((prev) => ({
                ...prev,
                from: vals?.[0] ?? null,
                to: vals?.[1] ?? null,
              }))
            }
          />
        </Form.Item>
        <Form.Item label={displayText(operations.email_address)}>
          <Input
            allowClear
            className="filter-bar__w-220"
            value={draft.email}
            onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Form.Item>
        <Form.Item label={displayText(shell.metadata_status)}>
          <Select
            allowClear
            className="filter-bar__w-180"
            value={draft.status || undefined}
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: emailStatusLabel(s, operations),
            }))}
            onChange={(v) => setDraft((prev) => ({ ...prev, status: v ?? "" }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {displayText(shell.apply)}
          </Button>
        </Form.Item>
      </Form>

      {error ? <Alert type="error" showIcon title={error} className="admin-page__banner" /> : null}

      <p className="admin-page__summary">
        {displayTextTemplate(operations.emails_show_summary, {
          from: rangeFrom,
          to: rangeTo,
          count: total,
        })}
      </p>

      <Spin spinning={loading}>
        <AdminCompactTable<EmailNotificationStatusItem>
          loadingOverlay={loading}
          rowKey="id"
          dataSource={data?.items ?? []}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
          columns={columns}
        />
      </Spin>
    </AdminPageShell>
  );
}
