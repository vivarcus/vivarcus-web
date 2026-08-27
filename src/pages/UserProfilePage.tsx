import { EditOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Select, Spin, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import "../styles/pages/user-profile.css";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { UserProfileModel, UserProfilePatch } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import {
  UserProfileGeneralFieldEdit,
  UserProfileGeneralFieldView,
  generalFieldDraftValue,
  isLocaleAllowedForLanguageEdit,
  localeReferenceOptionsForLanguage,
} from "../components/UserProfileGeneralField";
import type { AvatarDialogChoice } from "../components/UserProfileAvatarModal";
import {
  UserProfilePasswordModal,
  type ChangePasswordPayload,
} from "../components/UserProfilePasswordModal";
import { ProfileImageField } from "../components/ProfileImageField";

type EmailPrefMode = "never" | "every_occurrence" | "summary";

type EmailPrefRow = UserProfileModel["email_preferences"]["rows"][number];

function fieldValue(value: string | undefined, empty: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : empty;
}

function ProfileField({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | undefined;
  empty: string;
}) {
  return (
    <div className="field-grid__item">
      <dt className="field-grid__label">{label}</dt>
      <dd className="field-grid__value">{fieldValue(value, empty)}</dd>
    </div>
  );
}

function modeFromRow(row: EmailPrefRow): EmailPrefMode {
  if (row.mode) return row.mode;
  if (row.never) return "never";
  if (row.summary) return "summary";
  return "every_occurrence";
}

function rowFromMode(row: EmailPrefRow, mode: EmailPrefMode): EmailPrefRow {
  return {
    ...row,
    mode,
    every_occurrence: mode === "every_occurrence",
    summary: mode === "summary",
    never: mode === "never",
  };
}

export function UserProfilePage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<UserProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [generalDraft, setGeneralDraft] = useState<Record<string, string>>({});
  const [emailDraft, setEmailDraft] = useState<EmailPrefRow[]>([]);
  const [emailDirty, setEmailDirty] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.userProfile(vaultId);
      setModel(data);
      setEmailDraft(data.email_preferences.rows);
      setEmailDirty(false);
      setEditingGeneral(false);
      setGeneralDraft({});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : displayText(shell.load_failed),
      );
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePatch = useCallback(
    async (patch: UserProfilePatch) => {
      if (!vaultId) return;
      setSaving(true);
      setError(null);
      try {
        const data = await api.updateUserProfile(vaultId, patch);
        setModel(data);
        setEmailDraft(data.email_preferences.rows);
        setEmailDirty(false);
        setEditingGeneral(false);
        setGeneralDraft({});
        message.success(
          displayText(model?.chrome?.saved_label, "Profile saved"),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(shell.save_failed));
      } finally {
        setSaving(false);
      }
    },
    [vaultId, model?.chrome?.saved_label, shell.save_failed],
  );

  const startGeneralEdit = () => {
    const draft: Record<string, string> = {};
    for (const field of model?.general_fields ?? []) {
      if (field.editable) {
        draft[field.name] = generalFieldDraftValue(field);
      }
    }
    setGeneralDraft(draft);
    setEditingGeneral(true);
  };

  const cancelGeneralEdit = () => {
    setEditingGeneral(false);
    setGeneralDraft({});
  };

  const saveGeneralEdit = async () => {
    await savePatch({ general_fields: generalDraft });
  };

  const updateGeneralDraft = (fieldName: string, next: string) => {
    setGeneralDraft((draft) => {
      const updated = { ...draft, [fieldName]: next };
      if (fieldName !== "language__sys") {
        return updated;
      }
      const locale = updated.locale__sys ?? "";
      if (
        locale &&
        !isLocaleAllowedForLanguageEdit(
          model?.l10n?.locale_references_by_language,
          next,
          locale,
        )
      ) {
        updated.locale__sys = "";
      }
      return updated;
    });
  };

  const setEmailMode = (key: string, mode: EmailPrefMode) => {
    setEmailDraft((rows) =>
      rows.map((row) => (row.key === key ? rowFromMode(row, mode) : row)),
    );
    setEmailDirty(true);
  };

  const saveEmailPrefs = async () => {
    await savePatch({
      email_preferences: {
        rows: emailDraft.map((row) => ({
          key: row.key,
          mode: modeFromRow(row),
        })),
        summary_interval_id: model?.email_preferences.summary_interval_id,
      },
    });
  };

  const confirmAvatarChange = async (choice: AvatarDialogChoice) => {
    if (!vaultId) return;
    setAvatarSaving(true);
    setError(null);
    try {
      let updated = model;
      if (choice.mode === "default") {
        if (!model?.profile?.avatar_media_id) {
          return;
        }
        updated = await api.clearUserProfileAvatar(vaultId);
      } else {
        updated = await api.uploadUserProfileAvatar(vaultId, choice.file);
      }
      setModel(updated);
      message.success(displayText(updated?.chrome?.saved_label, "Profile saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
      throw err;
    } finally {
      setAvatarSaving(false);
    }
  };

  const confirmPasswordChange = async (payload: ChangePasswordPayload) => {
    if (!vaultId) return;
    setPasswordSaving(true);
    try {
      await api.changeUserProfilePassword(vaultId, payload);
      setPasswordOpen(false);
      message.success(
        displayText(model?.chrome?.password_changed_label, "Password changed"),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!vaultId) {
    return null;
  }

  const chrome = model?.chrome;
  const profile = model?.profile;
  const empty = displayText(shell.empty_value);
  const canEditEmail = model?.capabilities.can_edit_email_preferences === true;
  const prefsDisabled = !canEditEmail;
  const emailHelp = displayText(
    chrome?.email_preferences_help,
    "Configure which notifications you receive by email.",
  );

  return (
    <div className="user-profile-page">
      <aside className="user-profile-page__sidebar">
        {loading && !model ? (
          <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
        ) : profile ? (
          <>
            <div className="user-profile-page__identity">
              <ProfileImageField
                vaultId={vaultId}
                imageUrl={profile.avatar_url}
                mediaRecordId={profile.avatar_media_id}
                alt={profile.name}
                editable={model?.capabilities.can_edit_avatar === true && !saving && !avatarSaving}
                editLabel={displayText(chrome?.edit_label, "Edit")}
                size="profile"
                chrome={chrome}
                onConfirm={confirmAvatarChange}
              />
              <h1 className="user-profile-page__name">{profile.name}</h1>
            </div>

            <dl className="user-profile-page__account">
              <div className="user-profile-page__account-row">
                <dt>{displayText(chrome?.email_label, "Email")}</dt>
                <dd>{profile.email}</dd>
              </div>
              <div className="user-profile-page__account-row">
                <dt>{displayText(chrome?.username_label, "User Name")}</dt>
                <dd>{profile.username}</dd>
              </div>
              {model?.capabilities.can_change_password ? (
                <div className="user-profile-page__account-row">
                  <dt>{displayText(chrome?.password_label, "Password")}</dt>
                  <dd>
                    <Button
                      type="link"
                      className="user-profile-page__link-btn"
                      onClick={() => setPasswordOpen(true)}
                    >
                      {displayText(chrome?.change_password, "Change Password")}
                    </Button>
                  </dd>
                </div>
              ) : null}
            </dl>

            <UserProfilePasswordModal
              open={passwordOpen}
              chrome={chrome}
              saving={passwordSaving}
              onCancel={() => setPasswordOpen(false)}
              onConfirm={confirmPasswordChange}
            />

            <section className="user-profile-page__groups">
              <h2 className="user-profile-page__groups-title">
                <TeamOutlined aria-hidden="true" />
                {displayText(chrome?.groups_title, "Groups")}
              </h2>
              {model.groups.length === 0 ? (
                <p className="user-profile-page__groups-empty">
                  {displayText(chrome?.no_groups, "No groups")}
                </p>
              ) : (
                <ul className="user-profile-page__groups-list">
                  {model.groups.map((group) => (
                    <li key={group.label}>{group.label}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </aside>

      <div className="user-profile-page__main">
        {error && <Alert type="error" title={error} showIcon role="alert" />}
        {model?.language_needs_reselect ? (
          <Alert
            type="warning"
            showIcon
            role="alert"
            title={displayText(
              chrome?.language_reselect_banner,
              "Your previous language is no longer available. Please choose a language.",
            )}
          />
        ) : null}

        {profile && (
          <div className="user-profile-page__body">
            <RecordSectionBlock
              title={displayText(chrome?.general_information_title, "General Information")}
              headerExtra={
                !editingGeneral ? (
                  <Button
                    type="text"
                    size="small"
                    className="user-profile-page__edit-btn"
                    icon={<EditOutlined aria-hidden="true" />}
                    aria-label={displayText(chrome?.edit_label, "Edit")}
                    disabled={!model?.capabilities.can_edit_general_info || saving}
                    onClick={startGeneralEdit}
                  >
                    {displayText(chrome?.edit_label, "Edit")}
                  </Button>
                ) : (
                  <span className="user-profile-page__inline-actions">
                    <Button size="small" disabled={saving} onClick={cancelGeneralEdit}>
                      {displayText(chrome?.cancel_label, "Cancel")}
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      loading={saving}
                      onClick={() => void saveGeneralEdit()}
                    >
                      {displayText(chrome?.save_label, "Save")}
                    </Button>
                  </span>
                )
              }
            >
              <dl className="field-grid field-grid--two-col field-grid--detail">
                {(model.general_fields ?? []).map((field) =>
                  editingGeneral && field.editable ? (
                    <UserProfileGeneralFieldEdit
                      key={field.name}
                      vaultId={vaultId}
                      field={field}
                      value={generalDraft[field.name] ?? ""}
                      displayContext={model.display_context}
                      localeReferenceOptions={
                        field.name === "locale__sys"
                          ? localeReferenceOptionsForLanguage(
                              model.l10n?.locale_references_by_language,
                              generalDraft.language__sys ?? "",
                              field.field_render?.reference_options,
                            )
                          : undefined
                      }
                      onChange={(next) => updateGeneralDraft(field.name, next)}
                    />
                  ) : (
                    <UserProfileGeneralFieldView
                      key={field.name}
                      vaultId={vaultId}
                      field={field}
                      empty={empty}
                      displayContext={model.display_context}
                    />
                  ),
                )}
              </dl>
            </RecordSectionBlock>

            {model.sections?.email_preferences !== false && (
            <RecordSectionBlock
              title={displayText(chrome?.email_preferences_title, "Email Preferences")}
              helpContent={emailHelp}
            >
                <Table
                  className="user-profile-page__email-table"
                  rowKey="key"
                  pagination={false}
                  columns={[
                    {
                      key: "label",
                      dataIndex: "label",
                      title: displayText(chrome?.notification_column, "Notification"),
                    },
                    {
                      key: "every_occurrence",
                      title: displayText(chrome?.every_occurrence_column, "Every Occurrence"),
                      className: "user-profile-page__email-table__check",
                      render: (_value, row) => (
                        <Checkbox
                          checked={modeFromRow(row) === "every_occurrence"}
                          disabled={prefsDisabled || row.read_only || saving}
                          onChange={() => setEmailMode(row.key, "every_occurrence")}
                          aria-label={`${row.label} every occurrence`}
                        />
                      ),
                    },
                    {
                      key: "summary",
                      title: displayText(chrome?.summary_column, "Summary"),
                      className: "user-profile-page__email-table__check",
                      render: (_value, row) =>
                        row.supports_summary ? (
                          <Checkbox
                            checked={modeFromRow(row) === "summary"}
                            disabled={prefsDisabled || row.read_only || saving}
                            onChange={() => setEmailMode(row.key, "summary")}
                            aria-label={`${row.label} summary`}
                          />
                        ) : null,
                    },
                    {
                      key: "never",
                      title: displayText(chrome?.never_column, "Never"),
                      className: "user-profile-page__email-table__check",
                      render: (_value, row) => (
                        <Checkbox
                          checked={modeFromRow(row) === "never"}
                          disabled={prefsDisabled || row.read_only || saving}
                          onChange={() => setEmailMode(row.key, "never")}
                          aria-label={`${row.label} never`}
                        />
                      ),
                    },
                  ]}
                  dataSource={emailDraft}
                />
                <div className="user-profile-page__summary-interval">
                  <label htmlFor="summary-email-interval">
                    {displayText(chrome?.summary_interval_label, "Summary Email Interval")}
                  </label>
                  <Select
                    id="summary-email-interval"
                    disabled={prefsDisabled || saving}
                    defaultValue={model.email_preferences.summary_interval_id ?? "daily"}
                    options={[
                      {
                        value: "daily",
                        label: model.email_preferences.summary_interval ?? "Daily",
                      },
                    ]}
                    style={{ minWidth: "10rem" }}
                  />
                </div>
                {canEditEmail && emailDirty && (
                  <div className="user-profile-page__section-actions">
                    <Button
                      type="primary"
                      loading={saving}
                      onClick={() => void saveEmailPrefs()}
                    >
                      {displayText(chrome?.save_label, "Save")}
                    </Button>
                  </div>
                )}
            </RecordSectionBlock>
            )}

            {model.sections?.mobile_app_registrations && (
            <RecordSectionBlock
              title={displayText(chrome?.mobile_app_registrations_title, "Mobile App Registrations")}
            >
              {(model.mobile_app_registrations?.registrations ?? []).length === 0 ? (
                <p className="user-profile-page__empty">{displayText(chrome?.no_mobile_registrations, "No mobile app registrations")}</p>
              ) : (
                <ul className="user-profile-page__plain-list">
                  {model.mobile_app_registrations!.registrations.map((reg) => (
                    <li key={`${reg.app_label}-${reg.device_label}`}>
                      {reg.app_label} — {reg.device_label}
                    </li>
                  ))}
                </ul>
              )}
            </RecordSectionBlock>
            )}

            {model.sections?.search_preferences && (
            <RecordSectionBlock
              title={displayText(chrome?.search_preferences_title, "Search Preferences")}
            >
              {model.search_preferences?.preferred_language ? (
                <dl className="field-grid field-grid--two-col field-grid--detail">
                  <ProfileField
                    label={displayText(chrome?.preferred_language_label, "Preferred Language")}
                    value={model.search_preferences.preferred_language}
                    empty={empty}
                  />
                </dl>
              ) : (
                <p className="user-profile-page__empty">{displayText(chrome?.no_search_preferences, "No search preferences configured")}</p>
              )}
            </RecordSectionBlock>
            )}

            {model.sections?.delegate_access && (
            <RecordSectionBlock
              title={displayText(chrome?.delegate_access_title, "Delegate Access")}
            >
              {(model.delegate_access?.delegations ?? []).length === 0 ? (
                <p className="user-profile-page__empty">{displayText(chrome?.no_delegations, "No delegations")}</p>
              ) : (
                <ul className="user-profile-page__plain-list">
                  {model.delegate_access!.delegations.map((item) => (
                    <li key={item.label}>{item.label}</li>
                  ))}
                </ul>
              )}
            </RecordSectionBlock>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
