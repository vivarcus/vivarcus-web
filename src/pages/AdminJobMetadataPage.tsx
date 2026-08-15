import { Alert, Button, Descriptions, Form, Input, InputNumber, Select, Space, Spin, Tag, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { JobMetadataDetail, JobMetadataListItem } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

const TIMEOUT_OPTIONS = [
  { value: -1, label: "Default" },
  { value: 60, label: "60 minutes" },
  { value: 240, label: "240 minutes" },
  { value: 480, label: "480 minutes" },
  { value: 720, label: "720 minutes" },
  { value: 1380, label: "1380 minutes" },
];

function formatSingleInstanceStates(
  states: string[] | undefined,
  operations: {
    scheduled: { text: string };
    queued: { text: string };
    running: { text: string };
  },
): string {
  if (!states?.length) return "";
  const map: Record<string, string> = {
    scheduled: displayText(operations.scheduled),
    queued: displayText(operations.queued),
    running: displayText(operations.running),
  };
  return states.map((s) => map[s.toLowerCase()] ?? s).join(", ");
}

export function AdminJobMetadataPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const operations = shell.operations;
  const [items, setItems] = useState<JobMetadataListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listJobMetadata(vaultId);
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
      title={displayText(operations.sdk_job_metadata)}
      actions={<Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>}
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        <AdminCompactTable<JobMetadataListItem>
          loadingOverlay={loading}
          rowKey="api_name"
          dataSource={items}
          locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
          columns={[
            {
              title: displayText(shell.metadata_lifecycle_name),
              dataIndex: "api_name",
              render: (name: string) => (
                <Link to={`/admin/operations/sdk_job_metadata/${encodeURIComponent(name)}`}>{name}</Link>
              ),
            },
            { title: displayText(shell.metadata_field_label), dataIndex: "label" },
            {
              title: displayText(shell.metadata_status),
              dataIndex: "status",
              width: 100,
              render: (status: string) => (
                <Tag color={status === "Active" ? "success" : "default"}>
                  {status === "Active"
                    ? displayText(operations.status_active)
                    : status === "Inactive"
                      ? displayText(operations.status_inactive)
                      : status}
                </Tag>
              ),
            },
            {
              title: displayText(operations.source),
              dataIndex: "source",
              width: 100,
              render: (source: string) =>
                source === "standard"
                  ? displayText(operations.source_standard)
                  : displayText(operations.source_custom),
            },
          ]}
          onRow={(row) => ({
            onClick: () =>
              navigate(`/admin/operations/sdk_job_metadata/${encodeURIComponent(row.api_name)}`),
          })}
        />
      </Spin>
    </AdminPageShell>
  );
}

export function AdminJobMetadataDetailPage() {
  const vaultId = useVaultId();
  const { apiName: rawName } = useParams<{ apiName: string }>();
  const apiName = decodeURIComponent(rawName ?? "");
  const { shell } = useUi();
  const operations = shell.operations;
  const [detail, setDetail] = useState<JobMetadataDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!vaultId || !apiName) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.getJobMetadata(vaultId, apiName);
      setDetail(d);
      form.setFieldsValue({
        label: d.label,
        description: d.description,
        status: d.status,
        chunk_size: d.chunk_size,
        job_code: d.job_code,
        queue_api_name: d.queue_api_name,
        single_instance_states: d.single_instance_states,
        timeout_duration_minutes: d.timeout_duration_minutes ?? -1,
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
      const timeoutMins =
        values.timeout_duration_minutes == null || values.timeout_duration_minutes < 0
          ? null
          : values.timeout_duration_minutes;
      const next = await api.updateJobMetadata(vaultId, apiName, {
        label: values.label,
        active: values.status === "Active",
        chunk_size: values.chunk_size,
        description: values.description ?? "",
        job_code: values.job_code,
        queue_api_name: values.queue_api_name,
        single_instance_states: values.single_instance_states,
        timeout_duration_minutes: timeoutMins,
      });
      setDetail(next);
      message.success(displayText(operations.saved));
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!vaultId) return null;

  const timeoutDisplay =
    detail?.timeout_duration === "Default" || detail?.timeout_duration_minutes == null
      ? "Default"
      : `${detail.timeout_duration_minutes} minutes`;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/operations/sdk_job_metadata">
            {displayText(operations.sdk_job_metadata)}
          </Link>
        </p>
      }
      title={`${displayText(operations.sdk_job_metadata_detail)} ${detail?.label || apiName}`}
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
        {detail && !detail.can_edit ? (
          <Descriptions column={1} bordered size="small" className="admin-form--wide">
            <Descriptions.Item label={displayText(shell.metadata_field_label)}>{detail.label}</Descriptions.Item>
            <Descriptions.Item label={displayText(shell.metadata_lifecycle_name)}>{detail.api_name}</Descriptions.Item>
            <Descriptions.Item label={displayText(shell.metadata_status)}>{detail.status}</Descriptions.Item>
            <Descriptions.Item label="Chunk Size">{detail.chunk_size}</Descriptions.Item>
            <Descriptions.Item label="Single Instance Status">
              {formatSingleInstanceStates(detail.single_instance_states, operations)}
            </Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || "—"}</Descriptions.Item>
            <Descriptions.Item label="Job Code">{detail.job_code}</Descriptions.Item>
            <Descriptions.Item label="Queue">{detail.queue_label}</Descriptions.Item>
            <Descriptions.Item label="Timeout Duration">{timeoutDisplay}</Descriptions.Item>
            <Descriptions.Item label="Source">{detail.source_label}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical" className="admin-form--narrow" disabled={!detail?.can_edit}>
            <Form.Item name="label" label={displayText(shell.metadata_field_label)} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={displayText(shell.metadata_lifecycle_name)}>
              <Input value={apiName} disabled />
            </Form.Item>
            <Form.Item name="status" label={displayText(shell.metadata_status)} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Active", label: displayText(shell.metadata_status_active) },
                  { value: "Inactive", label: displayText(shell.metadata_status_inactive) },
                ]}
              />
            </Form.Item>
            <Form.Item name="chunk_size" label="Chunk Size" rules={[{ required: true }]}>
              <InputNumber min={1} max={500} />
            </Form.Item>
            <Form.Item name="single_instance_states" label="Single Instance Status">
              <Select
                mode="multiple"
                options={[
                  { value: "scheduled", label: displayText(operations.scheduled) },
                  { value: "queued", label: displayText(operations.queued) },
                  { value: "running", label: displayText(operations.running) },
                ]}
              />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="job_code" label="Job Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="queue_api_name" label="Queue">
              <Input placeholder="System (empty) or custom queue api name" />
            </Form.Item>
            <Form.Item name="timeout_duration_minutes" label="Timeout Duration">
              <Select options={TIMEOUT_OPTIONS} />
            </Form.Item>
          </Form>
        )}
      </Spin>
    </AdminPageShell>
  );
}
