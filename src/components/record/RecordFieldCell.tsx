import type { DisplayContext, FormElement, PageElement } from "../../api/types";
import { displayText } from "../../lib/i18n";
import { isFieldRequired } from "../../renderers/formUtils";
import { resolveFormRendererKind, resolveDisplayRendererKind } from "../../renderers/resolveKind";
import { FieldValue } from "../FieldValue";
import { FormFieldInput } from "../FormFieldInput";
import { recordFieldDomId } from "./recordSectionUtils";

type ViewProps = {
  mode: "view";
  vaultId: string;
  element: Pick<
    PageElement,
    | "label"
    | "field_api_name"
    | "field_type"
    | "target_object_api_name"
    | "value"
    | "support_state"
    | "field_render"
  >;
  tabApiName?: string;
  displayContext?: DisplayContext;
  onRecordMutated?: () => void | Promise<void>;
};

type EditProps = {
  mode: "edit";
  vaultId: string;
  element: FormElement;
  value: unknown;
  onChange: (value: unknown) => void;
  recordIdPlaceholder?: string;
  displayContext?: DisplayContext;
  formValues?: Record<string, unknown>;
  formFieldDisplays?: Record<string, string>;
  formFieldLabels?: Record<string, string>;
  controllingParents?: Record<string, string>;
};

export type RecordFieldCellProps = ViewProps | EditProps;

function fieldLabelText(element: { label?: PageElement["label"]; field_api_name?: string }) {
  return displayText(element.label, element.field_api_name);
}

function isRichTextField(
  element: Pick<PageElement | FormElement, "field_type" | "field_render">,
  mode: "view" | "edit",
): boolean {
  if (element.field_type === "RichText" || element.field_render?.field_type === "RichText") {
    return true;
  }
  if (mode === "edit") {
    return resolveFormRendererKind(element as FormElement) === "rich_text_editor";
  }
  return (
    resolveDisplayRendererKind({
      fieldType: element.field_type,
      fieldRender: element.field_render,
    }) === "display_rich_text"
  );
}

function fieldGridItemClassName(
  element: Pick<PageElement | FormElement, "field_type" | "field_render" | "field_api_name" | "target_object_api_name">,
  mode: "view" | "edit",
  rendererKind: ReturnType<typeof resolveFormRendererKind> | null,
): string {
  const multiline =
    mode === "edit" &&
    (rendererKind === "textarea" || rendererKind === "rich_text_editor");
  const isImage =
    rendererKind === "image_picker" ||
    element.field_render?.renderer_kind === "image_picker" ||
    element.field_render?.renderer_kind === "display_image";
  return [
    "field-grid__item",
    mode === "edit" ? "field-grid__item--edit" : "",
    multiline ? "field-grid__item--multiline" : "",
    isRichTextField(element, mode) ? "field-grid__item--rich-text" : "",
    isImage ? "field-grid__item--image" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
function FieldLabelHeading({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <>
      {label}
      {required && <span className="field__required">*</span>}
    </>
  );
}

export function RecordFieldCell(props: RecordFieldCellProps) {
  if (props.mode === "edit") {
    const {
      element,
      vaultId,
      value,
      onChange,
      recordIdPlaceholder,
      displayContext,
      formValues,
      formFieldDisplays,
      formFieldLabels,
      controllingParents,
    } = props;
    if (element.support_state === "unsupported" || element.field_render?.support_state === "unsupported") {
      return null;
    }
    const label = fieldLabelText(element);
    const fieldId = element.field_api_name ? recordFieldDomId(element.field_api_name) : undefined;
    const rendererKind = resolveFormRendererKind(element);
    return (
      <div
        className={fieldGridItemClassName(element, "edit", rendererKind)}
        id={fieldId}
        data-field-api-name={element.field_api_name}
      >
        <dt>
          <FieldLabelHeading label={label} required={isFieldRequired(element)} />
        </dt>
        <dd>
          <FormFieldInput
            vaultId={vaultId}
            element={element}
            value={value}
            onChange={onChange}
            recordIdPlaceholder={recordIdPlaceholder}
            displayContext={displayContext}
            formValues={formValues}
            formFieldDisplays={formFieldDisplays}
            formFieldLabels={formFieldLabels}
            controllingParents={controllingParents}
            showLabel={false}
          />
          {(element.field_render?.hint ?? []).map((message, index) => (
            <span key={`hint-${index}`} className="field__hint">
              {message}
            </span>
          ))}
          {(element.field_render?.validation_message ?? []).map((message, index) => (
            <span key={`error-${index}`} className="field__hint field__hint--error">
              {message}
            </span>
          ))}
        </dd>
      </div>
    );
  }

  const { element, vaultId, tabApiName, displayContext, onRecordMutated } = props;
  if (
    element.support_state === "unsupported" ||
    element.field_render?.support_state === "unsupported"
  ) {
    return null;
  }
  return (
    <div className={fieldGridItemClassName(element, "view", null)}>
      <dt>{fieldLabelText(element)}</dt>
      <dd>
        <FieldValue
          vaultId={vaultId}
          value={element.value}
          fieldApiName={element.field_api_name}
          fieldType={element.field_type}
          targetObjectApiName={element.target_object_api_name}
          tabApiName={tabApiName}
          displayContext={displayContext}
          fieldRender={element.field_render}
          hoverCard={element.field_render?.hover_card}
          onRecordMutated={onRecordMutated}
        />
      </dd>
    </div>
  );
}
