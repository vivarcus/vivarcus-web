import { Input } from "antd";
import { ObjectReferenceInput } from "../components/ObjectReferenceInput";
import { useFormMeta } from "../context/FormMetaContext";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { FormRendererProps } from "./types";
import { FieldUnavailableControl, wrapFormControl } from "./fieldChrome";
import { resolveEffectiveReferenceCriteria } from "../lib/studyScopeReference";
import {
  isFieldDisabled,
  isFieldRequired,
  resolveFieldLabel,
  resolveFieldUnavailableMessage,
  hasReferenceOptions,
  resolveReferenceOptions,
  resolveRelationshipCriteria,
  resolveTargetObjectApiName,
} from "./formUtils";

function resolveReferenceDisplayValue(element: FormRendererProps["element"], value: unknown): string {
  const displayValue = element.field_render?.display_value;
  if (displayValue != null && String(displayValue).trim() !== "") {
    return String(displayValue);
  }
  if (value == null || value === "") {
    return "";
  }
  return String(value);
}

export function RecordPickerRenderer({
  vaultId,
  element,
  value,
  onChange,
  showLabel = true,
  formValues,
  formFieldDisplays,
  formFieldLabels,
  controllingParents,
}: FormRendererProps) {
  const { shell } = useUi();
  const formMeta = useFormMeta();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const target = resolveTargetObjectApiName(element);
  const constrainedOptions = hasReferenceOptions(element);
  const referenceOptions = resolveReferenceOptions(element);
  const presetOptions = constrainedOptions
    ? referenceOptions.map((entry) => ({
        recordId: entry.name,
        label: entry.label,
      }))
    : undefined;
  const emptyHint = element.field_render?.hint?.[0];
  const relationshipCriteria = resolveEffectiveReferenceCriteria(
    target,
    resolveRelationshipCriteria(element),
    element.field_render?.controlling_field_api_name,
  );
  // Self-referential inline create inherits the parent form's object type (Veeva parity for
  // Related Inquiry on Other Communication → nested create stays base__v, not default site_contact).
  const createObjectType =
    target &&
    formMeta.objectApiName &&
    target === formMeta.objectApiName &&
    formMeta.objectTypeApiName
      ? formMeta.objectTypeApiName
      : undefined;

  if (!target) {
    const hint = resolveFieldUnavailableMessage(element, shell.reference_missing_target);
    return wrapFormControl(
      <FieldUnavailableControl
        hint={hint}
        control={
          <Input
            value={resolveReferenceDisplayValue(element, value)}
            disabled
            readOnly
            aria-label={showLabel ? undefined : label}
          />
        }
      />,
      { label, required, showLabel },
    );
  }

  return (
    <ObjectReferenceInput
      vaultId={vaultId}
      targetObject={target}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      label={label}
      showLabel={showLabel}
      presetOptions={presetOptions}
      relationshipCriteria={relationshipCriteria}
      controllingFieldApiName={element.field_render?.controlling_field_api_name}
      sourceFieldValues={formValues}
      formFieldDisplays={formFieldDisplays}
      formFieldLabels={formFieldLabels}
      controllingParents={controllingParents}
      emptyHint={emptyHint}
      createObjectInline={Boolean(element.field_render?.create_object_inline)}
      createObjectType={createObjectType}
      targetObjectLabel={
        element.field_render?.target_object_label
          ? displayText(element.field_render.target_object_label)
          : undefined
      }
      displayLabel={
        element.field_render?.display_value != null &&
        String(element.field_render.display_value).trim() !== ""
          ? String(element.field_render.display_value)
          : undefined
      }
    />
  );
}
