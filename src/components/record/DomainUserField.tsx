import { Input, Modal, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { DisplayContext, DomainUserElement, DomainUserOption, FormSection, PicklistEntryOption } from "../../api/types";
import { displayText } from "../../lib/i18n";
import { defaultDomainUserChrome } from "../../lib/i18n/chromeTypes";
import { useUi } from "../../context/UiContext";
import { CreateDomainUserModal } from "./CreateDomainUserModal";
import { fieldGridClassName } from "./RecordFieldGrid";
import {
  applyCreateDomainUserDraft,
  draftFromValues,
  STAGED_NEW_DOMAIN_USER_VALUE,
  stagedDomainUserLabel,
  stringFieldValue,
  type CreateDomainUserDraft,
} from "./domainUserFormUtils";

type Props = {
  vaultId: string;
  config: DomainUserElement;
  values: Record<string, unknown>;
  onFieldChange: (name: string, value: unknown) => void;
  readOnly?: boolean;
  formSections?: FormSection[];
  localeReferencesByLanguage?: Record<string, PicklistEntryOption[]>;
  displayContext?: DisplayContext;
};

type SelectOption = {
  value: string;
  label: string;
  username: string;
  profile?: DomainUserOption;
};

type ReadonlyRow = {
  key: string;
  label: string;
  value: string;
};

function domainUserReadonlyRows(
  config: DomainUserElement,
  chrome: typeof defaultDomainUserChrome,
): ReadonlyRow[] {
  const displayName = stringFieldValue(config.display_name);
  const username = stringFieldValue(config.username);
  const email = stringFieldValue(config.email);
  const nameLabel = displayText(chrome.name_label);
  const usernameLabel = displayText(chrome.username_label);
  const emailLabel = displayText(chrome.email_label);
  const rows: ReadonlyRow[] = [];

  if (displayName && displayName !== username) {
    rows.push({ key: "name", label: nameLabel, value: displayName });
  }
  if (username) {
    rows.push({ key: "username", label: usernameLabel, value: username });
  }
  if (email && email !== username) {
    rows.push({ key: "email", label: emailLabel, value: email });
  }
  if (rows.length === 0) {
    rows.push({ key: "username", label: usernameLabel, value: "—" });
  }
  return rows;
}

export function displayNameFromProfile(option: DomainUserOption): string {
  const explicit = stringFieldValue(option.display_name);
  if (explicit) return explicit;
  const first = stringFieldValue(option.first_name);
  const last = stringFieldValue(option.last_name);
  if (first && last) {
    // Avoid "Base Document Chat Agent Agent" when first already ends with last.
    if (
      first.localeCompare(last, undefined, { sensitivity: "accent" }) === 0 ||
      first.toLowerCase().endsWith(` ${last.toLowerCase()}`)
    ) {
      return first;
    }
    return `${first} ${last}`;
  }
  if (first) return first;
  if (last) return last;
  return stringFieldValue(option.username);
}

export function applyDomainUserProfile(
  option: DomainUserOption,
  onFieldChange: (name: string, value: unknown) => void,
) {
  onFieldChange("domain_user_id__sys", option.user_id);
  onFieldChange("username__sys", option.username);
  if (option.first_name) {
    onFieldChange("first_name__sys", option.first_name);
  }
  if (option.last_name) {
    onFieldChange("last_name__sys", option.last_name);
  }
  if (option.email) {
    onFieldChange("email__sys", option.email);
  }
  const name = displayNameFromProfile(option);
  if (name) {
    onFieldChange("name__v", name);
  }
}

function hasStagedNewUser(selectedUserId: string, username: string): boolean {
  return !selectedUserId && Boolean(username);
}

export function DomainUserField({
  vaultId,
  config,
  values,
  onFieldChange,
  readOnly,
  formSections = [],
  localeReferencesByLanguage,
  displayContext,
}: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultDomainUserChrome, ...shell.domain_user };
  const domainId = config.domain_id;
  const selectedUserId = stringFieldValue(values.domain_user_id__sys);
  const username = stringFieldValue(values.username__sys);
  const stagedNew = hasStagedNewUser(selectedUserId, username);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stagedLabel, setStagedLabel] = useState(() =>
    stagedNew ? stagedDomainUserLabel(draftFromValues(values, domainId), domainId) : "",
  );
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SelectOption[]>(() => {
    if (selectedUserId && username) {
      return [{ value: selectedUserId, label: username, username }];
    }
    if (stagedNew) {
      const label = stagedDomainUserLabel(draftFromValues(values, domainId), domainId);
      return [{ value: STAGED_NEW_DOMAIN_USER_VALUE, label, username }];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectValue = selectedUserId || (stagedNew ? STAGED_NEW_DOMAIN_USER_VALUE : undefined);

  const selectOptions = useMemo(() => {
    if (!stagedNew || !stagedLabel) {
      return options;
    }
    if (options.some((opt) => opt.value === STAGED_NEW_DOMAIN_USER_VALUE)) {
      return options.map((opt) =>
        opt.value === STAGED_NEW_DOMAIN_USER_VALUE ? { ...opt, label: stagedLabel } : opt,
      );
    }
    return [{ value: STAGED_NEW_DOMAIN_USER_VALUE, label: stagedLabel, username }, ...options];
  }, [options, stagedLabel, stagedNew, username]);

  const loadOptions = useCallback(
    async (term: string) => {
      if (!vaultId || readOnly) return;
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.domainUserOptions(vaultId, term);
        setOptions(
          data.options.map((opt) => ({
            value: opt.user_id,
            label: opt.label || opt.username,
            username: opt.username,
            profile: opt,
          })),
        );
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : displayText(chrome.load_failed));
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [vaultId, readOnly, chrome],
  );

  useEffect(() => {
    if (readOnly || createModalOpen) return;
    const timer = window.setTimeout(() => {
      void loadOptions(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [createModalOpen, loadOptions, readOnly, search]);

  useEffect(() => {
    if (selectedUserId) {
      setStagedLabel("");
      return;
    }
    if (username) {
      setStagedLabel(stagedDomainUserLabel(draftFromValues(values, domainId), domainId));
    } else {
      setStagedLabel("");
    }
  }, [domainId, selectedUserId, username, values]);

  if (readOnly || config.read_only) {
    const rows = domainUserReadonlyRows(config, chrome);
    const gridClass = fieldGridClassName(2);
    return (
      <dl className={gridClass}>
        {rows.map((row) => (
          <div key={row.key} className="field-grid__item">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function selectExisting(userId: string) {
    if (userId === STAGED_NEW_DOMAIN_USER_VALUE) {
      return;
    }
    const option = selectOptions.find((opt) => opt.value === userId);
    if (option?.profile) {
      applyDomainUserProfile(option.profile, onFieldChange);
      return;
    }
    onFieldChange("domain_user_id__sys", userId);
    onFieldChange("username__sys", option?.username ?? "");
  }

  function clearSelection() {
    onFieldChange("domain_user_id__sys", "");
    onFieldChange("username__sys", "");
    setStagedLabel("");
  }

  function openCreateModal() {
    setCreateModalOpen(true);
  }

  function handleCreateSave(draft: CreateDomainUserDraft) {
    applyCreateDomainUserDraft(draft, domainId, onFieldChange);
    setStagedLabel(stagedDomainUserLabel(draft, domainId));
    setCreateModalOpen(false);
    setSearch("");
  }

  const gridClass = fieldGridClassName(1);

  return (
    <>
      <dl className={gridClass}>
        <div className="field-grid__item field-grid__item--edit">
          <dt>
            {displayText(chrome.field_label)}
            <span className="field__required">*</span>
          </dt>
          <dd>
            <Select
              showSearch
              allowClear
              filterOption={false}
              placeholder={displayText(chrome.search_placeholder)}
              value={selectValue}
              loading={loading}
              notFoundContent={loading ? <Spin size="small" /> : displayText(chrome.no_matching)}
              options={selectOptions}
              onSearch={setSearch}
              onChange={(value) => {
                if (!value) {
                  clearSelection();
                  return;
                }
                selectExisting(String(value));
              }}
              popupRender={(menu) => (
                <>
                  {menu}
                  <button
                    type="button"
                    className="domain-user-field__create-action"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openCreateModal}
                  >
                    {displayText(chrome.create_action)}
                  </button>
                </>
              )}
            />
            {loadError && <span className="field__hint field__hint--error">{loadError}</span>}
          </dd>
        </div>
      </dl>
      <CreateDomainUserModal
        open={createModalOpen}
        vaultId={vaultId}
        domainId={domainId}
        formSections={formSections}
        values={values}
        localeReferencesByLanguage={localeReferencesByLanguage}
        displayContext={displayContext}
        onCancel={() => setCreateModalOpen(false)}
        onSave={handleCreateSave}
      />
    </>
  );
}

// Re-export for tests and callers that already import from this module.
export {
  applyCreateDomainUserDraft,
  draftFromValues,
  type CreateDomainUserDraft,
} from "./domainUserFormUtils";
