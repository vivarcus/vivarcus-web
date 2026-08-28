import { Alert, Button, Checkbox, Form, Input, Select, Space, Tooltip, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { SandboxSnapshotsModel } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

type CreateFormValues = {
  source_sandbox_id: string;
  name: string;
  description: string;
  include_data: boolean;
};

export function AdminSandboxSnapshotCreatePage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<SandboxSnapshotsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSandboxSnapshots(vaultId);
      setModel(data);
      form.setFieldsValue({
        source_sandbox_id: data.source_options[0]?.id ?? "",
        name: "",
        description: "",
        include_data: false,
      });
    } catch (err) {
      setModel(null);
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed, form]);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceOptions = useMemo(() => {
    if (!model) return [];
    return model.source_options.map((row) => ({
      value: row.id,
      label: `${row.name} (${row.available})`,
    }));
  }, [model]);

  const submitCreate = async () => {
    if (!vaultId || !model) return;
    try {
      const values = await form.validateFields();
      setCreating(true);
      const result = await api.createSandboxSnapshot(vaultId, {
        source_sandbox_id: values.source_sandbox_id,
        name: values.name.trim(),
        description: values.description?.trim() || "",
        include_data: values.include_data,
      });
      message.success(result.message || displayText(model.chrome.create_success));
      navigate("/admin/deployment/sandbox_snapshots");
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setCreating(false);
    }
  };

  if (!vaultId) return null;

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return <Alert type="error" showIcon message={error} />;
  }

  if (!model) return null;

  const chrome = model.chrome;
  const listPath = "/admin/deployment/sandbox_snapshots";
  const canSubmit = model.can_create && sourceOptions.length > 0;

  return (
    <AdminPageShell
      title={displayText(chrome.create_page_title)}
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to={listPath}>{displayText(chrome.page_title)}</Link>
          {" › "}
        </p>
      }
      className="admin-page--create"
    >
      {!canSubmit && (
        <Alert
          type="warning"
          showIcon className="admin-page__banner"
          message={displayText(chrome.empty_list)}
        />
      )}

      <section>
        <h2 className="admin-page__details-title">
          {displayText(chrome.details_section_title, "Details")}
        </h2>

        <Form
          className="admin-page__create-form sandbox-deployment__create-form"
          form={form}
          layout="horizontal"
          labelAlign="left"
          colon={false}
          labelCol={{ flex: "140px" }}
          wrapperCol={{ flex: "1" }}
          requiredMark={(label, { required }) =>
            required ? (
              <>
                {label}
                <span className="admin-page__required">*</span>
              </>
            ) : (
              label
            )
          }
        >
          <Form.Item
            name="source_sandbox_id"
            label={displayText(chrome.field_source_sandbox)}
            rules={[{ required: true, message: displayText(chrome.field_source_sandbox) }]}
          >
            <Select options={sourceOptions} disabled={!canSubmit} />
          </Form.Item>
          <Form.Item
            name="name"
            label={displayText(chrome.field_name)}
            rules={[{ required: true, message: displayText(chrome.field_name) }]}
          >
            <Input autoFocus disabled={!canSubmit} />
          </Form.Item>
          <Form.Item name="description" label={displayText(chrome.field_description)}>
            <Input.TextArea rows={3} disabled={!canSubmit} />
          </Form.Item>
          <Form.Item
            label={
              <Tooltip title={displayText(chrome.field_include_data_help)}>
                <span>{displayText(chrome.field_include_data)}</span>
              </Tooltip>
            }
            name="include_data"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox disabled={!canSubmit} />
          </Form.Item>
        </Form>

        <div className="admin-page__create-actions">
          <Space>
            <Button type="link" onClick={() => navigate(listPath)}>
              {displayText(chrome.cancel)}
            </Button>
            <Button
              type="primary"
              loading={creating}
              disabled={!canSubmit}
              onClick={() => void submitCreate()}
            >
              {displayText(chrome.submit)}
            </Button>
          </Space>
        </div>
      </section>
    </AdminPageShell>
  );
}
