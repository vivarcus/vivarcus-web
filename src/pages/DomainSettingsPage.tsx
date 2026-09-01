import { Alert, Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type {
  DomainNetworkAccessRule,
  DomainOAuthProfile,
  DomainSAMLProfile,
  DomainSecurityPolicy,
  DomainSettingsModel,
  DomainSettingsPatchRequest,
} from "../api/types";
import { displayText } from "../lib/i18n";
import { emptySecurityPolicy, sessionIdleOptions } from "./securityPolicyForm";
import { SecurityPolicyDetail, SecurityPolicyList } from "./SecurityPolicySection";
import { emptyOAuthProfile } from "./oauthProfileForm";
import { OAuthProfileDetail, OAuthProfileList } from "./OAuthProfileSection";

const emptyPolicy = (): Partial<DomainSecurityPolicy> => emptySecurityPolicy();

export function DomainSettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "general";
  const policyId = searchParams.get("policyId") || "";
  const profileId = searchParams.get("profileId") || "";
  const isPolicyCreate = category === "security-policies" && policyId === "create";
  const isPolicyDetail =
    category === "security-policies" && policyId !== "" && policyId !== "create";
  const isPolicyEditor = isPolicyCreate || isPolicyDetail;
  const isProfileCreate = category === "oauth-profiles" && profileId === "create";
  const isProfileDetail =
    category === "oauth-profiles" && profileId !== "" && profileId !== "create";
  const isProfileEditor = isProfileCreate || isProfileDetail;
  const [model, setModel] = useState<DomainSettingsModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, boolean | number>>({});
  const [logoFiles, setLogoFiles] = useState<Record<string, File | null>>({});
  const [logoMeta, setLogoMeta] = useState<
    Record<string, { has_content?: boolean; filename?: string }>
  >({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [policyDraft, setPolicyDraft] = useState<Partial<DomainSecurityPolicy>>(emptyPolicy());
  const [ruleDraft, setRuleDraft] = useState<Partial<DomainNetworkAccessRule>>({
    name: "",
    cidr: "",
    action: "allow",
    priority: 100,
    enabled: true,
    description: "",
  });
  const [samlDraft, setSamlDraft] = useState<Partial<DomainSAMLProfile> & { private_key?: string }>({
    profile_key: "",
    name: "",
    status: "active",
    idp_entity_id: "",
    idp_metadata_url: "",
    idp_metadata_xml: "",
    sp_entity_id: "",
    name_id_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    acs_url: "",
    signing_certificate_pem: "",
    encryption_certificate_pem: "",
    is_esignature_profile: false,
    private_key: "",
  });
  const [oauthDraft, setOauthDraft] = useState<
    Partial<DomainOAuthProfile> & { client_secret?: string }
  >(emptyOAuthProfile());
  const [secretModal, setSecretModal] = useState<{
    kind: "saml_profile" | "oauth_profile";
    id: string;
    name: string;
  } | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [bindModal, setBindModal] = useState<{
    oauthProfileId: string;
    profileName: string;
  } | null>(null);
  const [bindUsername, setBindUsername] = useState("");
  const [bindSubjectId, setBindSubjectId] = useState("");

  const chrome = model?.chrome;

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const detail =
        isPolicyDetail && policyId
          ? { policyId }
          : isProfileDetail && profileId
            ? { profileId }
            : undefined;
      const data = await api.domainSettings(vaultId, category, detail);
      setModel(data);
      if (isPolicyCreate) {
        setPolicyDraft(emptyPolicy());
      } else if (data.selected_policy) {
        setPolicyDraft(data.selected_policy);
      }
      if (isProfileCreate) {
        setOauthDraft(emptyOAuthProfile());
      } else if (data.selected_oauth_profile) {
        setOauthDraft(data.selected_oauth_profile);
      }
      const next: Record<string, boolean | number> = {};
      const nextLogoMeta: Record<string, { has_content?: boolean; filename?: string }> = {};
      for (const setting of data.settings ?? []) {
        const raw = setting.value?.[setting.field_name];
        if (setting.field_type === "integer") {
          next[setting.definition_name] = typeof raw === "number" ? raw : Number(raw ?? 30);
        } else {
          next[setting.definition_name] = Boolean(raw);
        }
        if (setting.field_type === "logo") {
          nextLogoMeta[setting.definition_name] = {
            has_content: Boolean(setting.value?.has_content),
            filename: typeof setting.value?.filename === "string" ? setting.value.filename : "",
          };
        }
      }
      for (const feature of data.features ?? []) {
        next[feature.definition_name] = feature.effective_state === "enabled";
      }
      setDrafts(next);
      setLogoMeta(nextLogoMeta);
      setLogoFiles({});
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, category, policyId, profileId, isPolicyCreate, isPolicyDetail, isProfileCreate, isProfileDetail, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (body: DomainSettingsPatchRequest) => {
    if (!vaultId || !model?.can_edit) return;
    setSaving(true);
    try {
      const data = await api.patchDomainSettings(vaultId, {
        ...body,
        domain_id: body.domain_id ?? model?.domain_id,
      });
      if (isProfileDetail && category === "oauth-profiles" && body.action !== "delete") {
        const refreshed = await api.domainSettings(vaultId, category, {
          profileId,
          domainId: model?.domain_id,
        });
        setModel(refreshed);
        if (refreshed.selected_oauth_profile) {
          setOauthDraft(refreshed.selected_oauth_profile);
        }
      } else {
        setModel(data);
      }
      setEditorOpen(false);
      setSecretModal(null);
      setSecretValue("");
      setBindModal(null);
      setBindUsername("");
      setBindSubjectId("");
      message.success("Saved");
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSaving(false);
    }
  };

  const saveSetting = async (definitionName: string) => {
    const setting = model?.settings?.find((s) => s.definition_name === definitionName);
    const fieldName = setting?.field_name || "enabled";
    const draft = drafts[definitionName];
    if (setting?.field_type === "logo") {
      const patch: Record<string, unknown> = { enabled: Boolean(draft) };
      const file = logoFiles[definitionName];
      if (file) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]!);
        }
        patch.content_base64 = btoa(binary);
        patch.content_type = file.type || "image/png";
        patch.filename = file.name;
      }
      await mutate({
        kind: "setting",
        setting: { definition_name: definitionName, patch },
      });
      return;
    }
    const patchValue =
      setting?.field_type === "integer"
        ? Number(draft ?? 30)
        : Boolean(draft);
    await mutate({
      kind: "setting",
      setting: {
        definition_name: definitionName,
        patch: { [fieldName]: patchValue },
      },
    });
  };

  const saveFeature = async (definitionName: string) => {
    await mutate({
      kind: "feature",
      feature: {
        definition_name: definitionName,
        enabled: Boolean(drafts[definitionName]),
      },
    });
  };

  const openCreate = () => {
    setEditorMode("create");
    if (category === "security-policies") {
      setSearchParams({ category: "security-policies", policyId: "create" });
      setPolicyDraft(emptyPolicy());
      return;
    }
    if (category === "network-access") {
      setRuleDraft({
        name: "",
        cidr: "",
        action: "allow",
        priority: 100,
        enabled: true,
        description: "",
      });
    }
    if (category === "saml-profiles") {
      setSamlDraft({
        profile_key: "",
        name: "",
        status: "active",
        idp_entity_id: "",
        idp_metadata_url: "",
        idp_metadata_xml: "",
        sp_entity_id: "",
        name_id_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        acs_url: "",
        signing_certificate_pem: "",
        encryption_certificate_pem: "",
        is_esignature_profile: false,
        private_key: "",
      });
    }
    if (category === "oauth-profiles") {
      setSearchParams({ category: "oauth-profiles", profileId: "create" });
      setOauthDraft(emptyOAuthProfile());
      return;
    }
    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (category === "security-policies") {
      await mutate({
        kind: "security_policy",
        action: isPolicyCreate || editorMode === "create" ? "create" : "update",
        security_policy: {
          ...policyDraft,
          id: isPolicyDetail ? policyId : policyDraft.id,
        },
      });
      setSearchParams({ category: "security-policies" });
      return;
    }
    if (category === "network-access") {
      await mutate({
        kind: "network_rule",
        action: editorMode === "create" ? "create" : "update",
        network_rule: ruleDraft,
      });
      return;
    }
    if (category === "saml-profiles") {
      await mutate({
        kind: "saml_profile",
        action: editorMode === "create" ? "create" : "update",
        saml_profile: samlDraft,
      });
      return;
    }
    if (category === "oauth-profiles") {
      await mutate({
        kind: "oauth_profile",
        action: isProfileCreate || editorMode === "create" ? "create" : "update",
        oauth_profile: {
          ...oauthDraft,
          id: isProfileDetail ? profileId : oauthDraft.id,
        },
      });
      setSearchParams({ category: "oauth-profiles" });
    }
  };

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return (
      <AdminPageShell title={displayText(shell.admin_domain_settings)}>
        <Alert type="error" title={error} showIcon />
      </AdminPageShell>
    );
  }

  if (!model || !chrome) {
    return null;
  }

  const activeCategory = model.categories?.find((item) => item.key === model.active_category);
  const pageTitle = activeCategory
    ? displayText(activeCategory.label)
    : displayText(chrome.page_title);

  return (
    <AdminPageShell
      title={!isPolicyEditor && !isProfileEditor ? pageTitle : undefined}
    >
      <div className="admin-page__body admin-settings-form__body">
          {!model.can_edit ? (
            <Alert
              type="info"
              showIcon
              title={displayText(chrome.read_only_banner)}
              className="admin-page__banner"
            />
          ) : null}

          {model.active_category === "general" ? (
            <RecordSectionBlock>
              <div className="admin-settings-form__items">
                {(model.settings ?? []).map((setting) => (
                  <div key={setting.definition_name} className="admin-settings-form__item">
                    <div className="admin-settings-form__item-copy">
                      <div className="admin-settings-form__item-title">{setting.label}</div>
                      {setting.description ? (
                        <div className="admin-settings-form__item-desc">{setting.description}</div>
                      ) : null}
                    </div>
                    <div className="admin-settings-form__item-actions">
                      {setting.field_type === "integer" ? (
                        <Select
                          className="filter-bar__min-160"
                          value={Number(drafts[setting.definition_name] ?? 30)}
                          options={sessionIdleOptions(chrome).filter((opt) => opt.value > 0)}
                          disabled={!model.can_edit || saving}
                          onChange={(value) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [setting.definition_name]: Number(value),
                            }))
                          }
                        />
                      ) : setting.field_type === "logo" ? (
                        <div className="admin-settings-form__item-actions admin-settings-form__item-actions--stacked">
                          <Checkbox
                            checked={Boolean(drafts[setting.definition_name])}
                            disabled={!model.can_edit || saving}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [setting.definition_name]: e.target.checked,
                              }))
                            }
                          >
                            {displayText(chrome.enabled_label)}
                          </Checkbox>
                          <Input
                            type="file"
                            accept="image/png,image/jpeg"
                            disabled={!model.can_edit || saving}
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setLogoFiles((prev) => ({
                                ...prev,
                                [setting.definition_name]: file,
                              }));
                            }}
                          />
                          {logoFiles[setting.definition_name]?.name ||
                          logoMeta[setting.definition_name]?.filename ? (
                            <span className="admin-settings-form__item-desc">
                              {logoFiles[setting.definition_name]?.name ||
                                logoMeta[setting.definition_name]?.filename}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Checkbox
                          checked={Boolean(drafts[setting.definition_name])}
                          disabled={!model.can_edit || saving}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [setting.definition_name]: e.target.checked,
                            }))
                          }
                        >
                          {displayText(chrome.enabled_label)}
                        </Checkbox>
                      )}
                      <Button
                        type="primary"
                        size="small"
                        disabled={!model.can_edit || saving}
                        loading={saving}
                        onClick={() => void saveSetting(setting.definition_name)}
                      >
                        {displayText(chrome.save_label)}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </RecordSectionBlock>
          ) : null}

          {model.active_category === "features" ? (
            <RecordSectionBlock>
              <div className="admin-settings-form__items">
                {(model.features ?? []).map((feature) => (
                  <div key={feature.definition_name} className="admin-settings-form__item">
                    <div className="admin-settings-form__item-copy">
                      <div className="admin-settings-form__item-title">{feature.label}</div>
                      {feature.description ? (
                        <div className="admin-settings-form__item-desc">{feature.description}</div>
                      ) : null}
                    </div>
                    <div className="admin-settings-form__item-actions">
                      <Switch
                        checked={Boolean(drafts[feature.definition_name])}
                        disabled={!model.can_edit || !feature.editable || saving}
                        onChange={(checked) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [feature.definition_name]: checked,
                          }))
                        }
                      />
                      <Button
                        type="primary"
                        size="small"
                        disabled={!model.can_edit || !feature.editable || saving}
                        loading={saving}
                        onClick={() => void saveFeature(feature.definition_name)}
                      >
                        {displayText(chrome.save_label)}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </RecordSectionBlock>
          ) : null}

          {model.active_category === "security-policies" ? (
            isPolicyCreate || isPolicyDetail ? (
              <SecurityPolicyDetail
                model={model}
                chrome={chrome}
                policyDraft={policyDraft}
                setPolicyDraft={setPolicyDraft}
                isPolicyCreate={isPolicyCreate}
                saving={saving}
                onBack={() => setSearchParams({ category: "security-policies" })}
                onSave={() => void saveEditor()}
                onDelete={() =>
                  void mutate({
                    kind: "security_policy",
                    action: "delete",
                    delete: { id: policyId },
                  }).then(() => setSearchParams({ category: "security-policies" }))
                }
              />
            ) : (
              <SecurityPolicyList
                model={model}
                chrome={chrome}
                saving={saving}
                onCreate={openCreate}
                onOpenPolicy={(id) =>
                  setSearchParams({ category: "security-policies", policyId: id })
                }
                onResetAllPasswords={() =>
                  Modal.confirm({
                    title: displayText(chrome.reset_all_passwords_label),
                    content:
                      "Force all password users in this domain to change password on next login?",
                    onOk: () =>
                      mutate({
                        kind: "security_policy",
                        action: "reset_all_passwords",
                      }),
                  })
                }
              />
            )
          ) : null}

          {model.active_category === "network-access" ? (
            <RecordSectionBlock>
              <div className="admin-settings-form__toolbar">
                <Space wrap>
                  <span>{displayText(chrome.default_action_label)}</span>
                  <Select
                    value={model.network_settings?.default_action ?? "allow"}
                    className="filter-bar__min-120"
                    disabled={!model.can_edit || saving}
                    options={[
                      { value: "allow", label: displayText(chrome.allow_label) },
                      { value: "deny", label: displayText(chrome.deny_label) },
                    ]}
                    onChange={(value) =>
                      void mutate({
                        kind: "network_settings",
                        action: "update",
                        network_settings: { default_action: value },
                      })
                    }
                  />
                  <Button type="primary" disabled={!model.can_edit || saving} onClick={openCreate}>
                    {displayText(chrome.create_label)}
                  </Button>
                </Space>
              </div>
              <AdminCompactTable
                rowKey="id"
                locale={{ emptyText: adminTableEmptyText(displayText(chrome.empty_list_label)) }}
                dataSource={model.network_rules ?? []}
                columns={[
                  { title: displayText(chrome.name_label), dataIndex: "name" },
                  { title: displayText(chrome.cidr_label), dataIndex: "cidr" },
                  { title: displayText(chrome.action_label), dataIndex: "action" },
                  { title: displayText(chrome.priority_label), dataIndex: "priority" },
                  {
                    title: displayText(chrome.enabled_label),
                    dataIndex: "enabled",
                    render: (v: boolean) => (v ? displayText(chrome.enabled_label) : displayText(chrome.disabled_label)),
                  },
                  {
                    title: displayText(chrome.actions_column),
                    render: (_, row) => (
                      <Space>
                        <Button
                          size="small"
                          disabled={!model.can_edit || saving}
                          onClick={() => {
                            setEditorMode("edit");
                            setRuleDraft(row);
                            setEditorOpen(true);
                          }}
                        >
                          {displayText(chrome.edit_label)}
                        </Button>
                        <Button
                          size="small"
                          danger
                          disabled={!model.can_edit || saving}
                          onClick={() =>
                            void mutate({
                              kind: "network_rule",
                              action: "delete",
                              delete: { id: row.id },
                            })
                          }
                        >
                          {displayText(chrome.delete_label)}
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </RecordSectionBlock>
          ) : null}

          {model.active_category === "saml-profiles" ? (
            <RecordSectionBlock>
              <div className="admin-settings-form__toolbar">
                <Button type="primary" disabled={!model.can_edit || saving} onClick={openCreate}>
                  {displayText(chrome.create_label)}
                </Button>
              </div>
              <AdminCompactTable
                rowKey="id"
                locale={{ emptyText: adminTableEmptyText(displayText(chrome.empty_list_label)) }}
                dataSource={model.saml_profiles ?? []}
                columns={[
                  { title: displayText(chrome.name_label), dataIndex: "name" },
                  { title: displayText(chrome.key_label), dataIndex: "profile_key" },
                  { title: displayText(chrome.idp_entity_id_label), dataIndex: "idp_entity_id" },
                  {
                    title: displayText(chrome.private_key_label),
                    dataIndex: "private_key_masked",
                    render: (v: string) => v || "—",
                  },
                  {
                    title: displayText(chrome.actions_column),
                    render: (_, row) => (
                      <Space>
                        <Button
                          size="small"
                          disabled={!model.can_edit || saving}
                          onClick={() => {
                            setEditorMode("edit");
                            setSamlDraft(row);
                            setEditorOpen(true);
                          }}
                        >
                          {displayText(chrome.edit_label)}
                        </Button>
                        <Button
                          size="small"
                          disabled={!model.can_edit || saving}
                          onClick={() =>
                            setSecretModal({ kind: "saml_profile", id: row.id, name: row.name })
                          }
                        >
                          {displayText(chrome.reset_secret_label)}
                        </Button>
                        <Button
                          size="small"
                          danger
                          disabled={!model.can_edit || saving}
                          onClick={() =>
                            void mutate({
                              kind: "saml_profile",
                              action: "delete",
                              delete: { id: row.id },
                            })
                          }
                        >
                          {displayText(chrome.delete_label)}
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </RecordSectionBlock>
          ) : null}

          {model.active_category === "oauth-profiles" ? (
            isProfileCreate || isProfileDetail ? (
              <OAuthProfileDetail
                model={model}
                chrome={chrome}
                profileDraft={oauthDraft}
                setProfileDraft={setOauthDraft}
                isProfileCreate={isProfileCreate}
                saving={saving}
                onBack={() => setSearchParams({ category: "oauth-profiles" })}
                onSave={() => void saveEditor()}
                onDelete={() =>
                  void mutate({
                    kind: "oauth_profile",
                    action: "delete",
                    delete: { id: profileId },
                  }).then(() => setSearchParams({ category: "oauth-profiles" }))
                }
                onResetSecret={() =>
                  setSecretModal({
                    kind: "oauth_profile",
                    id: profileId,
                    name: oauthDraft.name || "Profile",
                  })
                }
                onBindFederatedId={() => {
                  setBindUsername("");
                  setBindSubjectId("");
                  setBindModal({
                    oauthProfileId: profileId,
                    profileName: oauthDraft.name || "Profile",
                  });
                }}
              />
            ) : (
              <OAuthProfileList
                model={model}
                chrome={chrome}
                saving={saving}
                onCreate={openCreate}
                onOpenProfile={(id) =>
                  setSearchParams({ category: "oauth-profiles", profileId: id })
                }
              />
            )
          ) : null}
      </div>

      <Modal
        open={editorOpen}
        title={editorMode === "create" ? displayText(chrome.create_label) : displayText(chrome.edit_label)}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void saveEditor()}
        confirmLoading={saving}
        okButtonProps={{ disabled: !model.can_edit }}
        width={720}
        destroyOnClose
      >
        {category === "network-access" ? (
          <Form layout="vertical">
            <Form.Item label={displayText(chrome.name_label)} required>
              <Input
                value={ruleDraft.name}
                onChange={(e) => setRuleDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.cidr_ip_label)} required>
              <Input
                value={ruleDraft.cidr}
                placeholder="10.0.0.0/8"
                onChange={(e) => setRuleDraft((p) => ({ ...p, cidr: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.action_label)}>
              <Select
                value={ruleDraft.action}
                options={[
                  { value: "allow", label: displayText(chrome.allow_label) },
                  { value: "deny", label: displayText(chrome.deny_label) },
                ]}
                onChange={(v) => setRuleDraft((p) => ({ ...p, action: v }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.priority_label)}>
              <InputNumber
                value={ruleDraft.priority}
                onChange={(v) => setRuleDraft((p) => ({ ...p, priority: Number(v ?? 100) }))}
              />
            </Form.Item>
            <Checkbox
              checked={ruleDraft.enabled}
              onChange={(e) => setRuleDraft((p) => ({ ...p, enabled: e.target.checked }))}
            >
              {displayText(chrome.enabled_label)}
            </Checkbox>
          </Form>
        ) : null}

        {category === "saml-profiles" ? (
          <Form layout="vertical">
            {editorMode === "create" ? (
              <Form.Item label={displayText(chrome.profile_key_label)} required>
                <Input
                  value={samlDraft.profile_key}
                  onChange={(e) => setSamlDraft((p) => ({ ...p, profile_key: e.target.value }))}
                />
              </Form.Item>
            ) : null}
            <Form.Item label={displayText(chrome.name_label)} required>
              <Input
                value={samlDraft.name}
                onChange={(e) => setSamlDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.idp_entity_id_label)} required>
              <Input
                value={samlDraft.idp_entity_id}
                onChange={(e) => setSamlDraft((p) => ({ ...p, idp_entity_id: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.sp_entity_id_label)} required>
              <Input
                value={samlDraft.sp_entity_id}
                onChange={(e) => setSamlDraft((p) => ({ ...p, sp_entity_id: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.idp_metadata_url_label)}>
              <Input
                value={samlDraft.idp_metadata_url}
                onChange={(e) => setSamlDraft((p) => ({ ...p, idp_metadata_url: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label={displayText(chrome.idp_metadata_xml_label)}>
              <Input.TextArea
                rows={3}
                value={samlDraft.idp_metadata_xml}
                onChange={(e) => setSamlDraft((p) => ({ ...p, idp_metadata_xml: e.target.value }))}
              />
            </Form.Item>
            {editorMode === "create" ? (
              <Form.Item label={displayText(chrome.private_key_label)}>
                <Input.TextArea
                  rows={2}
                  value={samlDraft.private_key}
                  onChange={(e) => setSamlDraft((p) => ({ ...p, private_key: e.target.value }))}
                />
              </Form.Item>
            ) : null}
            <Checkbox
              checked={samlDraft.is_esignature_profile}
              onChange={(e) =>
                setSamlDraft((p) => ({ ...p, is_esignature_profile: e.target.checked }))
              }
            >
              {displayText(chrome.esignature_profile_label)}
            </Checkbox>
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={!!secretModal}
        title={displayText(chrome.reset_secret_label)}
        onCancel={() => {
          setSecretModal(null);
          setSecretValue("");
        }}
        onOk={() => {
          if (!secretModal) return;
          void mutate({
            kind: secretModal.kind,
            action: "reset",
            secret_reset: { id: secretModal.id, secret: secretValue },
          });
        }}
        confirmLoading={saving}
        okButtonProps={{ disabled: !model.can_edit || !secretValue.trim() }}
      >
        <p>{secretModal?.name}</p>
        <Input.Password
          value={secretValue}
          onChange={(e) => setSecretValue(e.target.value)}
          placeholder={displayText(chrome.new_secret_placeholder)}
        />
      </Modal>

      <Modal
        open={!!bindModal}
        title={displayText(chrome.bind_federated_id_label)}
        onCancel={() => {
          setBindModal(null);
          setBindUsername("");
          setBindSubjectId("");
        }}
        onOk={() => {
          if (!bindModal) return;
          void mutate({
            kind: "oauth_profile",
            action: "bind",
            federated_bind: {
              oauth_profile_id: bindModal.oauthProfileId,
              username: bindUsername.trim(),
              subject_id: bindSubjectId.trim(),
            },
          });
        }}
        confirmLoading={saving}
        okButtonProps={{
          disabled: !model.can_edit || !bindUsername.trim() || !bindSubjectId.trim(),
        }}
      >
        <p>{bindModal?.profileName}</p>
        <p className="admin-page__modal-note">
          {displayText(chrome.bind_federated_help)}
        </p>
        <Form layout="vertical">
          <Form.Item label={displayText(chrome.username_label)} required>
            <Input
              value={bindUsername}
              placeholder="user@domain.example.com"
              onChange={(e) => setBindUsername(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={displayText(chrome.subject_id_label)} required>
            <Input
              value={bindSubjectId}
              onChange={(e) => setBindSubjectId(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminPageShell>
  );
}
