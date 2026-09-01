import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, InputNumber, Modal, Select, Space, Tooltip } from "antd";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import type {
  DomainOAuthProfile,
  DomainSAMLProfile,
  DomainSecurityPolicy,
  DomainSettingsModel,
  DomainSettingsPageChrome,
} from "../api/types";
import { displayText, displayTextTemplate } from "../lib/i18n";
import {
  apiTokenExpiryOptions,
  authTypeOptions,
  formatAuthenticationType,
  formatPolicyStatus,
  lockoutUnlockOptions,
  mfaMethodOptions,
  nearestSelectValue,
  passwordExpiryOptions,
  passwordHistoryOptions,
  passwordResetLimitOptions,
  policyListFilterOptions,
  sessionIdleOptions,
  statusOptions,
} from "./securityPolicyForm";

type PolicyDraft = Partial<DomainSecurityPolicy>;

type PolicyFieldRowProps = {
  label: string;
  children: ReactNode;
  help?: string;
};

function PolicyFieldRow({ label, children, help }: PolicyFieldRowProps) {
  return (
    <div className="admin-settings-form__row admin-settings-form__row--wide-label admin-settings-form__row--bordered">
      <div className="admin-settings-form__label admin-settings-form__label--policy">
        {label}
        {help ? (
          <Tooltip title={help}>
            <QuestionCircleOutlined className="admin-settings-form__field-help" aria-hidden />
          </Tooltip>
        ) : null}
      </div>
      <div className="admin-settings-form__control admin-settings-form__control--wide">{children}</div>
    </div>
  );
}

type SecurityPolicyListProps = {
  model: DomainSettingsModel;
  chrome: DomainSettingsPageChrome;
  saving: boolean;
  onCreate: () => void;
  onOpenPolicy: (id: string) => void;
  onResetAllPasswords: () => void;
};

export function SecurityPolicyList({
  model,
  chrome,
  saving,
  onCreate,
  onOpenPolicy,
  onResetAllPasswords,
}: SecurityPolicyListProps) {
  const [listFilter, setListFilter] = useState("all");
  const policies = useMemo(() => {
    const rows = model.security_policies ?? [];
    if (listFilter === "active") return rows.filter((p) => p.status === "active");
    if (listFilter === "inactive") return rows.filter((p) => p.status === "inactive");
    return rows;
  }, [listFilter, model.security_policies]);

  return (
    <>
      <div className="admin-settings-form__toolbar">
        <Space wrap>
          <Select
            value={listFilter}
            options={policyListFilterOptions(chrome)}
            onChange={setListFilter}
            className="filter-bar__w-180"
          />
          <Button disabled={!model.can_edit || saving} onClick={onResetAllPasswords}>
            {displayText(chrome.reset_all_passwords_label)}
          </Button>
          <Button type="primary" disabled={!model.can_edit || saving} onClick={onCreate}>
            {displayText(chrome.create_label)}
          </Button>
        </Space>
      </div>
      <AdminCompactTable
        rowKey="id"
        locale={{ emptyText: adminTableEmptyText(displayText(chrome.empty_list_label)) }}
        dataSource={policies}
        columns={[
          {
            title: displayText(chrome.name_label),
            dataIndex: "name",
            render: (name: string, row: DomainSecurityPolicy) => (
              <Button
                type="link"
                className="admin-table__link-btn"
                onClick={() => onOpenPolicy(row.id)}
              >
                {name}
              </Button>
            ),
          },
          {
            title: displayText(chrome.authentication_type_label),
            dataIndex: "authentication_type",
            render: (value: string) => formatAuthenticationType(value, chrome),
          },
          {
            title: displayText(chrome.status_label),
            dataIndex: "status",
            render: (value: string) => formatPolicyStatus(value, chrome),
          },
        ]}
      />
    </>
  );
}

type SecurityPolicyDetailProps = {
  model: DomainSettingsModel;
  chrome: DomainSettingsPageChrome;
  policyDraft: PolicyDraft;
  setPolicyDraft: Dispatch<SetStateAction<PolicyDraft>>;
  isPolicyCreate: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function SecurityPolicyDetail({
  model,
  chrome,
  policyDraft,
  setPolicyDraft,
  isPolicyCreate,
  saving,
  onBack,
  onSave,
  onDelete,
}: SecurityPolicyDetailProps) {
  const samlProfiles = model.saml_profiles ?? [];
  const oauthProfiles = model.oauth_profiles ?? [];
  const isPassword = policyDraft.authentication_type !== "sso";
  const pageTitle = isPolicyCreate
    ? displayText(chrome.new_policy_title)
    : policyDraft.name || displayText(chrome.policy_fallback_title);
  const passwordExpiry = passwordExpiryOptions(chrome);
  const apiTokenExpiry = apiTokenExpiryOptions(chrome);

  const confirmDelete = () => {
    Modal.confirm({
      title: displayText(chrome.delete_label),
      content: displayTextTemplate(chrome.delete_policy_confirm, {
        name: policyDraft.name ?? "",
      }),
      okButtonProps: { danger: true },
      onOk: onDelete,
    });
  };

  return (
    <div className="admin-page__body admin-settings-form__body">
      <RecordPageHeader
        breadcrumb={[
          {
            label: displayText(chrome.security_policies_label),
            to: "/admin/settings/domain?category=security-policies",
          },
        ]}
        title={pageTitle}
        actions={
          <div className="page-header__actions">
            <Button disabled={saving} onClick={onBack}>
              {displayText(chrome.cancel_label)}
            </Button>
            <Button
              type="primary"
              disabled={!model.can_edit || saving}
              loading={saving}
              onClick={onSave}
            >
              {displayText(chrome.save_label)}
            </Button>
            {!isPolicyCreate && model.can_edit ? (
              <Button danger disabled={saving} onClick={confirmDelete}>
                {displayText(chrome.delete_label)}
              </Button>
            ) : null}
          </div>
        }
      />

      <RecordSectionBlock title={displayText(chrome.details_section)}>
        <div className="admin-settings-form__fields">
          {isPolicyCreate ? (
            <PolicyFieldRow label={displayText(chrome.policy_key_label)}>
              <Input
                value={policyDraft.policy_key}
                onChange={(e) => setPolicyDraft((p) => ({ ...p, policy_key: e.target.value }))}
                disabled={!model.can_edit || saving}
              />
            </PolicyFieldRow>
          ) : null}
          <PolicyFieldRow label={displayText(chrome.policy_name_label)}>
            <Input
              value={policyDraft.name}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, name: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label={displayText(chrome.description_label)}>
            <Input
              value={policyDraft.description}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, description: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label={displayText(chrome.status_label)}>
            <Select
              value={policyDraft.status}
              options={statusOptions(chrome)}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, status: value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title={displayText(chrome.security_settings_section)}>
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label={displayText(chrome.authentication_type_label)}>
            <Select
              value={policyDraft.authentication_type}
              options={authTypeOptions(chrome)}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, authentication_type: value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>

          {isPassword ? (
            <>
              <PolicyFieldRow label={displayText(chrome.password_requirements_label)}>
                <div className="admin-settings-form__checkbox-group">
                  <Checkbox
                    checked={policyDraft.password_require_digit}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_digit: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    {displayText(chrome.password_require_digit)}
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_upper}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_upper: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    {displayText(chrome.password_require_upper)}
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_lower}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_lower: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    {displayText(chrome.password_require_lower)}
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_special}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_special: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    {displayText(chrome.password_require_special)}
                  </Checkbox>
                </div>
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.min_password_length_label)}>
                <InputNumber
                  min={7}
                  max={40}
                  value={policyDraft.password_min_length}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_min_length: Number(value ?? 8) }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.password_expiration_label)}>
                <Select
                  value={nearestSelectValue(passwordExpiry, policyDraft.password_expiry_days ?? 0)}
                  options={passwordExpiry}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_expiry_days: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.password_history_label)}>
                <Select
                  value={policyDraft.password_history_count ?? 5}
                  options={passwordHistoryOptions(chrome)}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_history_count: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.password_reset_limit_label)}>
                <Select
                  value={policyDraft.password_reset_daily_limit ?? 0}
                  options={passwordResetLimitOptions(chrome)}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_reset_daily_limit: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.lockout_threshold_label)}>
                <InputNumber
                  min={0}
                  value={policyDraft.lockout_threshold}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, lockout_threshold: Number(value ?? 5) }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.lockout_duration_label)}>
                <Select
                  value={policyDraft.lockout_unlock_minutes ?? 30}
                  options={lockoutUnlockOptions(chrome)}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, lockout_unlock_minutes: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="">
                <Checkbox
                  checked={policyDraft.require_security_question}
                  onChange={(e) =>
                    setPolicyDraft((p) => ({
                      ...p,
                      require_security_question: e.target.checked,
                    }))
                  }
                  disabled={!model.can_edit || saving}
                >
                  {displayText(chrome.require_security_question)}
                </Checkbox>
              </PolicyFieldRow>
              <PolicyFieldRow label="">
                <Checkbox
                  checked={policyDraft.allow_browser_password_save}
                  onChange={(e) =>
                    setPolicyDraft((p) => ({
                      ...p,
                      allow_browser_password_save: e.target.checked,
                    }))
                  }
                  disabled={!model.can_edit || saving}
                >
                  {displayText(chrome.allow_browser_password_save)}
                </Checkbox>
              </PolicyFieldRow>
            </>
          ) : (
            <>
              <PolicyFieldRow label={displayText(chrome.saml_profile_label)}>
                <ProfileSelect
                  value={policyDraft.saml_profile_id}
                  profiles={samlProfiles.filter((p) => !p.is_esignature_profile)}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, saml_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.esignature_profile_label)}>
                <ProfileSelect
                  value={policyDraft.esignature_profile_id}
                  profiles={samlProfiles.filter((p) => p.is_esignature_profile)}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, esignature_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.oauth_oidc_profile_label)}>
                <ProfileSelect
                  value={policyDraft.oauth_profile_id}
                  profiles={oauthProfiles}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, oauth_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label={displayText(chrome.api_token_expiry_label)}>
                <Select
                  value={nearestSelectValue(apiTokenExpiry, policyDraft.api_token_expiry_days ?? 30)}
                  options={apiTokenExpiry}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, api_token_expiry_days: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
            </>
          )}

          <PolicyFieldRow label={displayText(chrome.session_idle_label)}>
            <Select
              value={policyDraft.session_idle_timeout_minutes ?? 0}
              options={sessionIdleOptions(chrome)}
              onChange={(value) =>
                setPolicyDraft((p) => ({ ...p, session_idle_timeout_minutes: value }))
              }
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow
            label={displayText(chrome.session_max_lifetime_label)}
            help={displayText(chrome.session_max_lifetime_help)}
          >
            <InputNumber
              min={1}
              max={48}
              value={policyDraft.session_max_lifetime_hours}
              onChange={(value) =>
                setPolicyDraft((p) => ({
                  ...p,
                  session_max_lifetime_hours: Number(value ?? 48),
                }))
              }
              disabled={!model.can_edit || saving}
              addonAfter={displayText(chrome.hours_suffix)}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title={displayText(chrome.mfa_section)}>
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="">
            <Checkbox
              checked={policyDraft.mfa_required}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, mfa_required: e.target.checked }))}
              disabled={!model.can_edit || saving}
            >
              {displayText(chrome.mfa_required)}
            </Checkbox>
          </PolicyFieldRow>
          <PolicyFieldRow label={displayText(chrome.mfa_methods_label)}>
            <Select
              mode="multiple"
              value={policyDraft.mfa_methods}
              options={mfaMethodOptions(chrome)}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, mfa_methods: value }))}
              disabled={!model.can_edit || saving || !policyDraft.mfa_required}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title={displayText(chrome.delegated_auth_section)}>
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="">
            <Checkbox
              checked={policyDraft.delegate_allowed}
              onChange={(e) =>
                setPolicyDraft((p) => ({ ...p, delegate_allowed: e.target.checked }))
              }
              disabled={!model.can_edit || saving}
            >
              {displayText(chrome.delegate_allowed)}
            </Checkbox>
          </PolicyFieldRow>
          <PolicyFieldRow label={displayText(chrome.delegate_max_days_label)}>
            <InputNumber
              min={0}
              value={policyDraft.delegate_max_days}
              onChange={(value) =>
                setPolicyDraft((p) => ({ ...p, delegate_max_days: Number(value ?? 30) }))
              }
              disabled={!model.can_edit || saving || !policyDraft.delegate_allowed}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title={displayText(chrome.compliance_section)}>
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label={displayText(chrome.compliance_text_label)}>
            <Input.TextArea
              rows={3}
              value={policyDraft.compliance_text}
              onChange={(e) =>
                setPolicyDraft((p) => ({ ...p, compliance_text: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label={displayText(chrome.compliance_version_label)}>
            <Input
              value={policyDraft.compliance_version}
              onChange={(e) =>
                setPolicyDraft((p) => ({ ...p, compliance_version: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>
    </div>
  );
}

type ProfileSelectProps = {
  value?: string;
  profiles: Array<DomainSAMLProfile | DomainOAuthProfile>;
  disabled?: boolean;
  onChange: (value?: string) => void;
};

function ProfileSelect({ value, profiles, disabled, onChange }: ProfileSelectProps) {
  return (
    <Select
      allowClear
      value={value || undefined}
      options={profiles.map((p) => ({ value: p.id, label: p.name }))}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
