import { Button, Checkbox, Input, Modal, Select, Space, Switch } from "antd";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import type {
  DomainOAuthProfile,
  DomainSettingsModel,
  DomainSettingsPageChrome,
} from "../api/types";
import { displayText } from "../lib/i18n";
import {
  FEISHU_DEFAULTS,
  PROFILE_LIST_FILTER_OPTIONS,
  PROVIDER_TYPE_OPTIONS,
  STATUS_OPTIONS,
  formatPolicyStatus,
  formatProviderType,
} from "./oauthProfileForm";

type ProfileDraft = Partial<DomainOAuthProfile> & { client_secret?: string };

type ProfileFieldRowProps = {
  label: string;
  children: ReactNode;
};

function ProfileFieldRow({ label, children }: ProfileFieldRowProps) {
  return (
    <div className="admin-settings-form__row admin-settings-form__row--wide-label admin-settings-form__row--bordered">
      <div className="admin-settings-form__label admin-settings-form__label--policy">{label}</div>
      <div className="admin-settings-form__control admin-settings-form__control--wide">{children}</div>
    </div>
  );
}

type OAuthProfileListProps = {
  model: DomainSettingsModel;
  chrome: DomainSettingsPageChrome;
  saving: boolean;
  onCreate: () => void;
  onOpenProfile: (id: string) => void;
};

export function OAuthProfileList({
  model,
  chrome,
  saving,
  onCreate,
  onOpenProfile,
}: OAuthProfileListProps) {
  const [listFilter, setListFilter] = useState("all");
  const profiles = useMemo(() => {
    const rows = model.oauth_profiles ?? [];
    if (listFilter === "active") return rows.filter((p) => p.status === "active");
    if (listFilter === "inactive") return rows.filter((p) => p.status === "inactive");
    return rows;
  }, [listFilter, model.oauth_profiles]);

  return (
    <>
      <div className="admin-settings-form__toolbar">
        <Space wrap>
          <Select
            value={listFilter}
            options={PROFILE_LIST_FILTER_OPTIONS}
            onChange={setListFilter}
            className="filter-bar__w-180"
          />
          <Button type="primary" disabled={!model.can_edit || saving} onClick={onCreate}>
            {displayText(chrome.create_label)}
          </Button>
        </Space>
      </div>
      <AdminCompactTable
        rowKey="id"
        locale={{ emptyText: adminTableEmptyText(displayText(chrome.empty_list_label)) }}
        dataSource={profiles}
        columns={[
          {
            title: "Name",
            dataIndex: "name",
            render: (name: string, row: DomainOAuthProfile) => (
              <Button type="link" className="admin-table__link-btn" onClick={() => onOpenProfile(row.id)}>
                {name}
              </Button>
            ),
          },
          {
            title: "Provider",
            dataIndex: "provider_type",
            render: (value: string) => formatProviderType(value),
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

type OAuthProfileDetailProps = {
  model: DomainSettingsModel;
  chrome: DomainSettingsPageChrome;
  profileDraft: ProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
  isProfileCreate: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  onResetSecret: () => void;
  onBindFederatedId: () => void;
};

export function OAuthProfileDetail({
  model,
  chrome,
  profileDraft,
  setProfileDraft,
  isProfileCreate,
  saving,
  onBack,
  onSave,
  onDelete,
  onResetSecret,
  onBindFederatedId,
}: OAuthProfileDetailProps) {
  const pageTitle = isProfileCreate ? "New Profile" : profileDraft.name || "Profile";

  const confirmDelete = () => {
    Modal.confirm({
      title: displayText(chrome.delete_label),
      content: `Delete OAuth profile "${profileDraft.name}"?`,
      okButtonProps: { danger: true },
      onOk: onDelete,
    });
  };

  return (
    <div className="admin-page__body admin-settings-form__body">
      <RecordPageHeader
        breadcrumb={[
          {
            label: displayText(chrome.oauth_profiles_label),
            to: "/admin/settings/domain?category=oauth-profiles",
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
            {!isProfileCreate && model.can_edit ? (
              <Button danger disabled={saving} onClick={confirmDelete}>
                {displayText(chrome.delete_label)}
              </Button>
            ) : null}
          </div>
        }
      />

      <RecordSectionBlock title="Details">
        <div className="admin-settings-form__fields">
          {isProfileCreate ? (
            <ProfileFieldRow label="Profile Key">
              <Input
                value={profileDraft.profile_key}
                onChange={(e) =>
                  setProfileDraft((p) => ({ ...p, profile_key: e.target.value }))
                }
                disabled={!model.can_edit || saving}
              />
            </ProfileFieldRow>
          ) : null}
          <ProfileFieldRow label="Name">
            <Input
              value={profileDraft.name}
              onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Description">
            <Input
              value={profileDraft.description}
              onChange={(e) => setProfileDraft((p) => ({ ...p, description: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Status">
            <Select
              value={profileDraft.status}
              options={STATUS_OPTIONS}
              onChange={(value) => setProfileDraft((p) => ({ ...p, status: value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          {isProfileCreate ? (
            <ProfileFieldRow label="Provider Type">
              <Select
                value={profileDraft.provider_type}
                options={PROVIDER_TYPE_OPTIONS}
                onChange={(value) => {
                  setProfileDraft((p) => ({
                    ...p,
                    provider_type: value,
                    ...(value === "feishu" ? FEISHU_DEFAULTS : {}),
                  }));
                }}
                disabled={!model.can_edit || saving}
              />
            </ProfileFieldRow>
          ) : (
            <ProfileFieldRow label="Provider Type">
              <Input value={formatProviderType(profileDraft.provider_type ?? "")} readOnly />
            </ProfileFieldRow>
          )}
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="Client Credentials">
        <div className="admin-settings-form__fields">
          <ProfileFieldRow label="Client ID">
            <Input
              value={profileDraft.client_id}
              onChange={(e) => setProfileDraft((p) => ({ ...p, client_id: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          {isProfileCreate ? (
            <ProfileFieldRow label="Client Secret">
              <Input.Password
                value={profileDraft.client_secret}
                onChange={(e) =>
                  setProfileDraft((p) => ({ ...p, client_secret: e.target.value }))
                }
                disabled={!model.can_edit || saving}
              />
            </ProfileFieldRow>
          ) : (
            <ProfileFieldRow label="Client Secret">
              <Space wrap>
                <Input value={profileDraft.client_secret_masked || "—"} readOnly />
                <Button disabled={!model.can_edit || saving} onClick={onResetSecret}>
                  {displayText(chrome.reset_secret_label)}
                </Button>
              </Space>
            </ProfileFieldRow>
          )}
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="OAuth / OIDC Endpoints">
        <div className="admin-settings-form__fields">
          <ProfileFieldRow label="Authorization Endpoint">
            <Input
              value={profileDraft.authorization_endpoint}
              onChange={(e) =>
                setProfileDraft((p) => ({ ...p, authorization_endpoint: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Token Endpoint">
            <Input
              value={profileDraft.token_endpoint}
              onChange={(e) => setProfileDraft((p) => ({ ...p, token_endpoint: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Userinfo Endpoint">
            <Input
              value={profileDraft.userinfo_endpoint}
              onChange={(e) =>
                setProfileDraft((p) => ({ ...p, userinfo_endpoint: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="JWKS URI">
            <Input
              value={profileDraft.jwks_uri}
              onChange={(e) => setProfileDraft((p) => ({ ...p, jwks_uri: e.target.value }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="Login Settings">
        <div className="admin-settings-form__fields">
          <ProfileFieldRow label="Scopes">
            <Input
              value={(profileDraft.scopes ?? []).join(", ")}
              onChange={(e) =>
                setProfileDraft((p) => ({
                  ...p,
                  scopes: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Login Button Label">
            <Input
              value={profileDraft.login_button_label}
              onChange={(e) =>
                setProfileDraft((p) => ({ ...p, login_button_label: e.target.value }))
              }
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="Enable Auth">
            <Switch
              checked={profileDraft.enable_auth ?? false}
              onChange={(checked) => setProfileDraft((p) => ({ ...p, enable_auth: checked }))}
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          {!isProfileCreate && profileDraft.redirect_uri ? (
            <ProfileFieldRow label="Redirect URI">
              <Input value={profileDraft.redirect_uri} readOnly />
            </ProfileFieldRow>
          ) : null}
          <ProfileFieldRow label="">
            <Checkbox
              checked={profileDraft.pkce_required}
              onChange={(e) =>
                setProfileDraft((p) => ({ ...p, pkce_required: e.target.checked }))
              }
              disabled={!model.can_edit || saving}
            >
              PKCE Required
            </Checkbox>
          </ProfileFieldRow>
        </div>
      </RecordSectionBlock>

      <RecordSectionBlock title="File Import">
        <div className="admin-settings-form__fields">
          <ProfileFieldRow label="Enable File Import">
            <Switch
              checked={profileDraft.enable_file_import ?? false}
              onChange={(checked) =>
                setProfileDraft((p) => ({ ...p, enable_file_import: checked }))
              }
              disabled={!model.can_edit || saving}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label="File Import Scopes">
            <Input
              value={(profileDraft.file_import_scopes ?? []).join(", ")}
              onChange={(e) =>
                setProfileDraft((p) => ({
                  ...p,
                  file_import_scopes: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              disabled={!model.can_edit || saving || !(profileDraft.enable_file_import ?? false)}
            />
          </ProfileFieldRow>
        </div>
      </RecordSectionBlock>

      {!isProfileCreate ? (
        <RecordSectionBlock title="Federated Identity">
          <div className="admin-settings-form__fields">
            <ProfileFieldRow label="Bind Federated ID">
              <Space orientation="vertical" className="admin-form__stack" size={8}>
                <p className="admin-page__hint">
                  The user must also be assigned an SSO Security Policy that references this OAuth
                  profile.
                </p>
                <Button disabled={!model.can_edit || saving} onClick={onBindFederatedId}>
                  Bind Federated ID
                </Button>
              </Space>
            </ProfileFieldRow>
          </div>
        </RecordSectionBlock>
      ) : null}
    </div>
  );
}
