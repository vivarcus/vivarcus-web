import type {
  DisplayContext,
  FormElement,
  PicklistEntryOption,
  UserProfileGeneralField,
} from "../api/types";
import { FieldValue } from "./FieldValue";
import { FormFieldInput } from "./FormFieldInput";

function toFormElement(
  field: UserProfileGeneralField,
  localeReferenceOptions?: PicklistEntryOption[],
): FormElement {
  let fieldRender = field.field_render ? { ...field.field_render } : undefined;
  if (field.name === "locale__sys" && localeReferenceOptions?.length) {
    fieldRender = {
      ...(fieldRender ?? {
        field_ref: { field_api_name: field.name },
        field_type: field.field_type ?? "Object",
        renderer_kind: "record_picker",
        support_state: "supported",
        visibility: "visible",
        editability: "editable",
        requiredness: "optional",
        required_satisfaction: "satisfied",
      }),
      reference_options: localeReferenceOptions,
    };
  }
  return {
    kind: "field",
    field_api_name: field.name,
    field_type: field.field_type,
    label: { text: field.label },
    read_only: field.read_only,
    support_state: field.support_state,
    target_object_api_name: field.target_object_api_name,
    field_render: fieldRender,
    picklist_options: fieldRender?.picklist_options,
    reference_options: fieldRender?.reference_options,
  };
}

function draftValue(field: UserProfileGeneralField): string {
  const input = field.field_render?.input_value ?? field.input_value;
  if (input == null) {
    return field.value ?? "";
  }
  if (typeof input === "string") {
    return input;
  }
  return String(input);
}

type ViewProps = {
  vaultId: string;
  field: UserProfileGeneralField;
  empty: string;
  displayContext?: DisplayContext;
};

type EditProps = {
  vaultId: string;
  field: UserProfileGeneralField;
  value: string;
  localeReferenceOptions?: PicklistEntryOption[];
  displayContext?: DisplayContext;
  onChange: (value: string) => void;
};

export function UserProfileGeneralFieldView({
  vaultId,
  field,
  empty,
  displayContext,
}: ViewProps) {
  if (field.support_state === "unsupported" || field.field_render?.support_state === "unsupported") {
    return null;
  }
  const displayValue =
    field.field_render?.display_value ?? field.value ?? empty;
  return (
    <div className="field-grid__item">
      <dt className="field-grid__label">{field.label}</dt>
      <dd className="field-grid__value">
        {field.field_render ? (
          <FieldValue
            vaultId={vaultId}
            value={displayValue}
            fieldApiName={field.name}
            fieldType={field.field_type}
            targetObjectApiName={field.target_object_api_name}
            displayContext={displayContext}
            fieldRender={field.field_render}
          />
        ) : (
          field.value?.trim() ? field.value : empty
        )}
      </dd>
    </div>
  );
}

export function UserProfileGeneralFieldEdit({
  vaultId,
  field,
  value,
  localeReferenceOptions,
  displayContext,
  onChange,
}: EditProps) {
  if (field.support_state === "unsupported" || field.field_render?.support_state === "unsupported") {
    return null;
  }
  const element = toFormElement(field, localeReferenceOptions);
  return (
    <div className="field-grid__item field-grid__item--edit">
      <dt className="field-grid__label">{field.label}</dt>
      <dd className="field-grid__value">
        <FormFieldInput
          vaultId={vaultId}
          element={element}
          value={value}
          onChange={(next) => onChange(String(next ?? ""))}
          displayContext={displayContext}
          showLabel={false}
        />
        {field.field_render?.validation_message?.map((message, index) => (
          <span key={index} className="field__hint field__hint--error">
            {message}
          </span>
        ))}
      </dd>
    </div>
  );
}

export function generalFieldDraftValue(field: UserProfileGeneralField): string {
  return draftValue(field);
}

export function localeReferenceOptionsForLanguage(
  byLanguage: Record<string, PicklistEntryOption[]> | undefined,
  languageRecordId: string,
  fallback: PicklistEntryOption[] | undefined,
): PicklistEntryOption[] {
  if (!byLanguage) {
    return fallback ?? [];
  }
  const key = languageRecordId.trim();
  if (key && byLanguage[key]) {
    return byLanguage[key];
  }
  return fallback ?? [];
}

export function isLocaleAllowedForLanguageEdit(
  byLanguage: Record<string, PicklistEntryOption[]> | undefined,
  languageRecordId: string,
  localeRecordId: string,
): boolean {
  if (!localeRecordId.trim()) {
    return true;
  }
  const options = localeReferenceOptionsForLanguage(byLanguage, languageRecordId, []);
  return options.some((option) => option.name === localeRecordId);
}
