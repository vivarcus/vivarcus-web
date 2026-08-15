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
import { displayText } from "../lib/i18n";
import {
  API_TOKEN_EXPIRY_OPTIONS,
  AUTH_TYPE_OPTIONS,
  LOCKOUT_UNLOCK_OPTIONS,
  PASSWORD_EXPIRY_OPTIONS,
  PASSWORD_HISTORY_OPTIONS,
  PASSWORD_RESET_LIMIT_OPTIONS,
  POLICY_LIST_FILTER_OPTIONS,
  SESSION_IDLE_OPTIONS,
  STATUS_OPTIONS,
  formatAuthenticationType,
  formatPolicyStatus,
  nearestSelectValue,
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
            options={POLICY_LIST_FILTER_OPTIONS}
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
            title: "Name",
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
            title: "Authentication Type",
            dataIndex: "authentication_type",
            render: (value: string) => formatAuthenticationType(value),
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (value: string) => formatPolicyStatus(value),
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
  const pageTitle = isPolicyCreate ? "New Policy" : policyDraft.name || "Policy";

  const confirmDelete = () => {
    Modal.confirm({
      title: displayText(chrome.delete_label),
      content: `Delete security policy "${policyDraft.name}"?`,
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
              Cancel
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

      <RecordSectionBlock title="Details">
        <div className="admin-settings-form__fields">
          {isPolicyCreate ? (
            <PolicyFieldRow label="Policy Key">
              <Input
                value={policyDraft.policy_key}
                onChange={(e) => setPolicyDraft((p) => ({ ...p, policy_key: e.target.value }))}
                disabled={!model.can_edit || saving}
              />
            </PolicyFieldRow>
          ) : null}
          <PolicyFieldRow label="Policy Name">
            <Input
              value={policyDraft.name}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, name: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label="Description">
            <Input
              value={policyDraft.description}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, description: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label="Status">
            <Select
              value={policyDraft.status}
              options={STATUS_OPTIONS}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, status: value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="Security Settings">
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="Authentication Type">
            <Select
              value={policyDraft.authentication_type}
              options={AUTH_TYPE_OPTIONS}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, authentication_type: value }))}
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>

          {isPassword ? (
            <>
              <PolicyFieldRow label="Password Requirements">
                <div className="admin-settings-form__checkbox-group">
                  <Checkbox
                    checked={policyDraft.password_require_digit}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_digit: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    Passwords require a number
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_upper}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_upper: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    Passwords require an upper-case letter
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_lower}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_lower: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    Passwords require a lower-case letter
                  </Checkbox>
                  <Checkbox
                    checked={policyDraft.password_require_special}
                    onChange={(e) =>
                      setPolicyDraft((p) => ({ ...p, password_require_special: e.target.checked }))
                    }
                    disabled={!model.can_edit || saving}
                  >
                    Passwords require a non-alphanumeric character
                  </Checkbox>
                </div>
              </PolicyFieldRow>
              <PolicyFieldRow label="Minimum Password Length">
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
              <PolicyFieldRow label="Password Expiration">
                <Select
                  value={nearestSelectValue(
                    PASSWORD_EXPIRY_OPTIONS,
                    policyDraft.password_expiry_days ?? 0,
                  )}
                  options={PASSWORD_EXPIRY_OPTIONS}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_expiry_days: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="Password History Reuse">
                <Select
                  value={policyDraft.password_history_count ?? 5}
                  options={PASSWORD_HISTORY_OPTIONS}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_history_count: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="Password Reset Daily Limit">
                <Select
                  value={policyDraft.password_reset_daily_limit ?? 0}
                  options={PASSWORD_RESET_LIMIT_OPTIONS}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, password_reset_daily_limit: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="Account Lockout Threshold">
                <InputNumber
                  min={0}
                  value={policyDraft.lockout_threshold}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, lockout_threshold: Number(value ?? 5) }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="Account Lockout Duration">
                <Select
                  value={policyDraft.lockout_unlock_minutes ?? 30}
                  options={LOCKOUT_UNLOCK_OPTIONS}
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
                  Require security question on password reset
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
                  Allow browsers to save and autofill password field on the login form
                </Checkbox>
              </PolicyFieldRow>
            </>
          ) : (
            <>
              <PolicyFieldRow label="SAML Profile">
                <ProfileSelect
                  value={policyDraft.saml_profile_id}
                  profiles={samlProfiles.filter((p) => !p.is_esignature_profile)}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, saml_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="eSignature Profile">
                <ProfileSelect
                  value={policyDraft.esignature_profile_id}
                  profiles={samlProfiles.filter((p) => p.is_esignature_profile)}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, esignature_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="OAuth / OIDC Profile">
                <ProfileSelect
                  value={policyDraft.oauth_profile_id}
                  profiles={oauthProfiles}
                  disabled={!model.can_edit || saving}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, oauth_profile_id: value ?? "" }))
                  }
                />
              </PolicyFieldRow>
              <PolicyFieldRow label="API Token Expiry">
                <Select
                  value={nearestSelectValue(
                    API_TOKEN_EXPIRY_OPTIONS,
                    policyDraft.api_token_expiry_days ?? 30,
                  )}
                  options={API_TOKEN_EXPIRY_OPTIONS}
                  onChange={(value) =>
                    setPolicyDraft((p) => ({ ...p, api_token_expiry_days: value }))
                  }
                  disabled={!model.can_edit || saving}
                />
              </PolicyFieldRow>
            </>
          )}

          <PolicyFieldRow label="Logout user after inactivity">
            <Select
              value={policyDraft.session_idle_timeout_minutes ?? 0}
              options={SESSION_IDLE_OPTIONS}
              onChange={(value) =>
                setPolicyDraft((p) => ({ ...p, session_idle_timeout_minutes: value }))
              }
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow
            label="Session Max Lifetime"
            help="Maximum session lifetime in hours (Veeva hard limit: 48)."
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
              addonAfter="hours"
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="Multi-Factor Authentication">
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="">
            <Checkbox
              checked={policyDraft.mfa_required}
              onChange={(e) => setPolicyDraft((p) => ({ ...p, mfa_required: e.target.checked }))}
              disabled={!model.can_edit || saving}
            >
              Require multi-factor authentication
            </Checkbox>
          </PolicyFieldRow>
          <PolicyFieldRow label="MFA Methods">
            <Select
              mode="multiple"
              value={policyDraft.mfa_methods}
              options={[
                { value: "totp", label: "TOTP" },
                { value: "webauthn", label: "WebAuthn" },
                { value: "sms", label: "SMS" },
              ]}
              onChange={(value) => setPolicyDraft((p) => ({ ...p, mfa_methods: value }))}
              disabled={!model.can_edit || saving || !policyDraft.mfa_required}
            />
          </PolicyFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="Delegated Authentication">
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="">
            <Checkbox
              checked={policyDraft.delegate_allowed}
              onChange={(e) =>
                setPolicyDraft((p) => ({ ...p, delegate_allowed: e.target.checked }))
              }
              disabled={!model.can_edit || saving}
            >
              Allow delegate authentication
            </Checkbox>
          </PolicyFieldRow>
          <PolicyFieldRow label="Delegate Max Days">
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

      <RecordSectionBlock title="Compliance">
        <div className="admin-settings-form__fields">
          <PolicyFieldRow label="Compliance Text">
            <Input.TextArea
              rows={3}
              value={policyDraft.compliance_text}
              onChange={(e) =>
                setPolicyDraft((p) => ({ ...p, compliance_text: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </PolicyFieldRow>
          <PolicyFieldRow label="Compliance Version">
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
