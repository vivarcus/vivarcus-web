import { Button, Input, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { DisplayContext, FormSection, PicklistEntryOption } from "../../api/types";
import { FormFieldInput } from "../FormFieldInput";
import { localeReferenceOptionsForLanguage } from "../UserProfileGeneralField";
import { defaultFormChrome, defaultShellChrome, displayText } from "../../lib/i18n";
import { defaultDomainUserChrome } from "../../lib/i18n/chromeTypes";
import { useUi } from "../../context/UiContext";
import {
  type CreateDomainUserDraft,
  draftFromValues,
  findFormField,
  isCreateDomainUserDraftValid,
} from "./domainUserFormUtils";

type Props = {
  open: boolean;
  vaultId: string;
  domainId: string;
  formSections: FormSection[];
  values: Record<string, unknown>;
  localeReferencesByLanguage?: Record<string, PicklistEntryOption[]>;
  displayContext?: DisplayContext;
  onCancel: () => void;
  onSave: (draft: CreateDomainUserDraft) => void;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <>
      {label}
      {required && <span className="field__required">*</span>}
    </>
  );
}

export function CreateDomainUserModal({
  open,
  vaultId,
  domainId,
  formSections,
  values,
  localeReferencesByLanguage,
  displayContext,
  onCancel,
  onSave,
}: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultDomainUserChrome, ...shell.domain_user };
  const [draft, setDraft] = useState<CreateDomainUserDraft>(() => draftFromValues(values, domainId));

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromValues(values, domainId));
  }, [domainId, open, values]);

  const languageField = useMemo(() => findFormField(formSections, "language__sys"), [formSections]);
  const localeField = useMemo(() => {
    const field = findFormField(formSections, "locale__sys");
    if (!field) return undefined;
    const localeOptions = localeReferenceOptionsForLanguage(
      localeReferencesByLanguage,
      draft.language,
      field.field_render?.reference_options,
    );
    if (!localeOptions.length) {
      return field;
    }
    return {
      ...field,
      field_render: {
        ...field.field_render,
        reference_options: localeOptions,
      },
    };
  }, [draft.language, formSections, localeReferencesByLanguage]);
  const timezoneField = useMemo(() => findFormField(formSections, "timezone__sys"), [formSections]);

  const canSave = isCreateDomainUserDraftValid(draft);
  const gridClass = "field-grid field-grid--detail create-domain-user-modal__grid";

  function updateDraft<K extends keyof CreateDomainUserDraft>(key: K, value: CreateDomainUserDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "language" && value !== prev.language) {
        next.locale = "";
      }
      return next;
    });
  }

  return (
    <Modal
      className="create-domain-user-modal"
      open={open}
      title={displayText(chrome.create_title)}
      width={800}
      destroyOnHidden
      onCancel={onCancel}
      footer={[
        <Button key="cancel" type="link" onClick={onCancel}>
          {displayText(defaultShellChrome.cancel)}
        </Button>,
        <Button key="save" type="primary" disabled={!canSave} onClick={() => onSave(draft)}>
          {displayText(defaultFormChrome.submit_save)}
        </Button>,
      ]}
    >
      <dl className={gridClass}>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--first-name">
          <dt>
            <FieldLabel label={displayText(chrome.first_name_label)} required />
          </dt>
          <dd>
            <Input value={draft.firstName} onChange={(e) => updateDraft("firstName", e.target.value)} />
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--language">
          <dt>
            <FieldLabel label={displayText(chrome.language_label)} required />
          </dt>
          <dd>
            {languageField ? (
              <FormFieldInput
                vaultId={vaultId}
                element={languageField}
                value={draft.language}
                onChange={(value) => updateDraft("language", String(value ?? ""))}
                displayContext={displayContext}
                showLabel={false}
              />
            ) : (
              <Input value={draft.language} onChange={(e) => updateDraft("language", e.target.value)} />
            )}
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--last-name">
          <dt>
            <FieldLabel label={displayText(chrome.last_name_label)} required />
          </dt>
          <dd>
            <Input value={draft.lastName} onChange={(e) => updateDraft("lastName", e.target.value)} />
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--locale">
          <dt>
            <FieldLabel label={displayText(chrome.locale_label)} required />
          </dt>
          <dd>
            {localeField ? (
              <FormFieldInput
                vaultId={vaultId}
                element={localeField}
                value={draft.locale}
                onChange={(value) => updateDraft("locale", String(value ?? ""))}
                displayContext={displayContext}
                showLabel={false}
              />
            ) : (
              <Input value={draft.locale} onChange={(e) => updateDraft("locale", e.target.value)} />
            )}
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--username">
          <dt>
            <FieldLabel label={displayText(chrome.user_name_label)} required />
          </dt>
          <dd>
            <div className="domain-username-input">
              <Input
                value={draft.localpart}
                onChange={(e) => updateDraft("localpart", e.target.value)}
              />
              {domainId ? (
                <span className="domain-username-input__suffix">@{domainId}</span>
              ) : null}
            </div>
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--email">
          <dt>
            <FieldLabel label={displayText(chrome.email_label)} required />
          </dt>
          <dd>
            <Input value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} />
          </dd>
        </div>
        <div className="field-grid__item field-grid__item--edit create-domain-user-modal__field--timezone">
          <dt>
            <FieldLabel label={displayText(chrome.timezone_label)} required />
          </dt>
          <dd>
            {timezoneField ? (
              <FormFieldInput
                vaultId={vaultId}
                element={timezoneField}
                value={draft.timezone}
                onChange={(value) => updateDraft("timezone", String(value ?? ""))}
                displayContext={displayContext}
                showLabel={false}
              />
            ) : (
              <Input value={draft.timezone} onChange={(e) => updateDraft("timezone", e.target.value)} />
            )}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
