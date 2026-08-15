import { Alert, Button, Form, Input, InputNumber, Select, Space, Spin, Tag, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { JobQueueDetail, JobQueueListItem } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

export function AdminJobQueuesPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [items, setItems] = useState<JobQueueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listJobQueues(vaultId);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  return (
    <AdminPageShell
      title="Job Queues"
      actions={<Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>}
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        <AdminCompactTable<JobQueueListItem>
          loadingOverlay={loading}
          rowKey="api_name"
          dataSource={items}
          locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
          columns={[
            {
              title: displayText(shell.metadata_lifecycle_name),
              dataIndex: "api_name",
              render: (name: string) => (
                <Link to={`/admin/operations/job_queue/${encodeURIComponent(name)}`}>{name}</Link>
              ),
            },
            { title: displayText(shell.metadata_field_label), dataIndex: "label" },
            {
              title: displayText(shell.metadata_status),
              dataIndex: "status",
              width: 100,
              render: (status: string) => (
                <Tag color={status === "Active" ? "success" : "default"}>{status}</Tag>
              ),
            },
            { title: "Max Concurrent Jobs", dataIndex: "max_concurrent_jobs", width: 160 },
          ]}
          onRow={(row) => ({
            onClick: () => navigate(`/admin/operations/job_queue/${encodeURIComponent(row.api_name)}`),
          })}
        />
      </Spin>
    </AdminPageShell>
  );
}

export function AdminJobQueueDetailPage() {
  const vaultId = useVaultId();
  const { apiName: rawName } = useParams<{ apiName: string }>();
  const apiName = decodeURIComponent(rawName ?? "");
  const { shell } = useUi();
  const [detail, setDetail] = useState<JobQueueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!vaultId || !apiName) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.getJobQueue(vaultId, apiName);
      setDetail(d);
      form.setFieldsValue({
        label: d.label,
        description: d.description,
        status: d.status,
        max_concurrent_jobs: d.max_concurrent_jobs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, apiName, form, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!vaultId || !apiName || !detail?.can_edit) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const next = await api.updateJobQueue(vaultId, apiName, values);
      setDetail(next);
      message.success("Saved");
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!vaultId) return null;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/operations/job_queue">Job Queues</Link>
        </p>
      }
      title={detail?.label || apiName}
      actions={
        <Space>
          {detail?.can_edit && (
            <Button type="primary" loading={saving} onClick={() => void save()}>
              {displayText(shell.save)}
            </Button>
          )}
        </Space>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" className="admin-form--narrow" disabled={!detail?.can_edit}>
          <Form.Item name="label" label={displayText(shell.metadata_field_label)} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label={displayText(shell.metadata_status)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "Active", label: displayText(shell.metadata_status_active) },
                { value: "Inactive", label: displayText(shell.metadata_status_inactive) },
              ]}
            />
          </Form.Item>
          <Form.Item name="max_concurrent_jobs" label="Max Concurrent Jobs" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
        </Form>
      </Spin>
    </AdminPageShell>
  );
}
