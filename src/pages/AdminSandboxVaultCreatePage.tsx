import { Alert, Button, Checkbox, Form, Input, Radio, Select, Space, Tooltip, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { SandboxVaultsModel } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

type CreateSource = "vault" | "snapshot";

type CreateFormValues = {
  source: CreateSource;
  source_snapshot_id?: string;
  name: string;
  size: string;
  release: string;
  domain_id: string;
  set_owner: boolean;
};

export function AdminSandboxVaultCreatePage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<SandboxVaultsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();
  const sourceMode = Form.useWatch("source", form) ?? "vault";

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSandboxVaults(vaultId);
      setModel(data);
      const firstSize = data.entitlements.find((row) => row.available > 0)?.size ?? "";
      form.setFieldsValue({
        source: "vault",
        source_snapshot_id: data.snapshots[0]?.id,
        name: "",
        size: firstSize,
        release: data.default_release_id || data.releases[0]?.id || "general",
        domain_id: data.default_domain_id || data.domains[0]?.id || "",
        set_owner: true,
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

  const sizeOptions = useMemo(() => {
    if (!model) return [];
    return model.entitlements
      .filter((row) => row.available > 0)
      .map((row) => ({ value: row.size, label: row.size_label }));
  }, [model]);

  const domainOptions = useMemo(() => {
    if (!model) return [];
    return model.domains.map((row) => ({ value: row.id, label: row.label }));
  }, [model]);

  const releaseOptions = useMemo(() => {
    if (!model) return [];
    return model.releases.map((row) => ({ value: row.id, label: row.label }));
  }, [model]);

  const snapshotOptions = useMemo(() => {
    if (!model) return [];
    return model.snapshots.map((row) => ({
      value: row.id,
      label: row.release ? `${row.name} (${row.release})` : row.name,
    }));
  }, [model]);

  const sourceDisplayName = model?.source_vault_name || model?.production_vault_name || "";

  const submitCreate = async () => {
    if (!vaultId || !model) return;
    try {
      const values = await form.validateFields();
      setCreating(true);
      const result = await api.createSandboxVault(vaultId, {
        source: values.source,
        source_snapshot_id:
          values.source === "snapshot" ? values.source_snapshot_id?.trim() : undefined,
        name: values.name.trim(),
        size: values.size,
        release: values.release,
        domain_id: values.domain_id.trim(),
        set_owner: values.set_owner,
      });
      message.success(result.message || displayText(model.chrome.create_success));
      navigate("/admin/deployment/sandbox_vaults");
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
  const listPath = "/admin/deployment/sandbox_vaults";

  return (
    <AdminPageShell
      title={displayText(chrome.create_modal_title)}
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to={listPath}>{displayText(chrome.page_title)}</Link>
          {" › "}
        </p>
      }
      className="admin-page--create"
    >
      <section>
        <h2 className="admin-page__details-title">{displayText(chrome.details_section_title)}</h2>

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
          <Form.Item name="source" className="sandbox-deployment__source-mode">
            <Radio.Group>
              <Radio value="vault">{displayText(chrome.source_from_vault)}</Radio>
              <Radio value="snapshot">{displayText(chrome.source_from_snapshot)}</Radio>
            </Radio.Group>
          </Form.Item>

          {sourceMode === "snapshot" ? (
            <Form.Item
              name="source_snapshot_id"
              label={displayText(chrome.field_source)}
              rules={[{ required: true, message: displayText(chrome.field_snapshot) }]}
            >
              <Select options={snapshotOptions} placeholder={displayText(chrome.field_snapshot)} />
            </Form.Item>
          ) : (
            <Form.Item label={displayText(chrome.field_source)}>
              <span className="sandbox-deployment__source-value">{sourceDisplayName}</span>
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label={displayText(chrome.field_name)}
            rules={[{ required: true, message: displayText(chrome.field_name) }]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="size"
            label={displayText(chrome.field_size)}
            rules={[{ required: true, message: displayText(chrome.field_size) }]}
          >
            <Select options={sizeOptions} />
          </Form.Item>
          <Form.Item
            name="release"
            label={displayText(chrome.field_release)}
            rules={[{ required: true, message: displayText(chrome.field_release) }]}
          >
            <Select options={releaseOptions} />
          </Form.Item>
          <Form.Item
            name="domain_id"
            label={displayText(chrome.field_domain)}
            rules={[{ required: true, message: displayText(chrome.field_domain) }]}
          >
            <Select options={domainOptions} />
          </Form.Item>
          <Form.Item
            label={
              <Tooltip title={displayText(chrome.field_set_owner_help)}>
                <span>{displayText(chrome.field_vault_owner)}</span>
              </Tooltip>
            }
            name="set_owner"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox>{displayText(chrome.field_set_owner)}</Checkbox>
          </Form.Item>
        </Form>

        <div className="admin-page__create-actions">
          <Space>
            <Button type="link" onClick={() => navigate(listPath)}>
              {displayText(chrome.cancel)}
            </Button>
            <Button type="primary" loading={creating} onClick={() => void submitCreate()}>
              {displayText(chrome.submit)}
            </Button>
          </Space>
        </div>
      </section>
    </AdminPageShell>
  );
}
