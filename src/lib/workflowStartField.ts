import type { FormElement, PageElement, WorkflowStartDialogControl } from "../api/types";

const REFERENCE_FIELD_TYPES = new Set(["Object", "ObjectReference", "ObjectParent"]);

function inferWorkflowRendererKind(element: FormElement): string | undefined {
  const fieldType = element.field_type ?? element.field_render?.field_type;
  if (fieldType && REFERENCE_FIELD_TYPES.has(fieldType)) {
    return "record_picker";
  }
  if (fieldType === "users") {
    return "user_picker";
  }
  return undefined;
}

/** Workflow WAD fields must stay editable even when the detail layout renders them read-only. */
export function forceWorkflowDialogEditable(element: FormElement): FormElement {
  const fieldRender = { ...(element.field_render ?? {}) };
  fieldRender.editability = "editable";
  if (fieldRender.renderer_kind?.startsWith("display_")) {
    delete fieldRender.renderer_kind;
  }
  const inferred = inferWorkflowRendererKind(element);
  if (inferred) {
    fieldRender.renderer_kind = inferred;
  }
  return {
    ...element,
    read_only: false,
    support_state: element.support_state === "readonly_only" ? "supported" : element.support_state,
    field_render: fieldRender,
  };
}

function pageElementToFormElement(element: PageElement, required?: boolean): FormElement {
  return {
    kind: element.kind,
    name: element.name,
    field_api_name: element.field_api_name,
    field_type: element.field_type,
    label: element.label,
    read_only: false,
    required,
    target_object_api_name: element.target_object_api_name,
    relationship_ref: element.relationship_ref,
    layout_element_id: element.layout_element_id,
    support_state: element.support_state,
    field_render: element.field_render,
    domain_user: element.domain_user,
  };
}

/** API name used as data-field-api-name on start-dialog controls. */
export function workflowControlFieldName(control: WorkflowStartDialogControl): string {
  return (
    control.field_api_name?.trim() ||
    control.participant_name?.trim() ||
    control.control_name?.trim() ||
    ""
  );
}

export function workflowDialogFieldElement(
  control: WorkflowStartDialogControl,
  pageElement?: PageElement,
): FormElement | undefined {
  if (control.field_element) {
    return forceWorkflowDialogEditable({
      ...control.field_element,
      read_only: false,
      required: control.required ?? control.field_element.required,
    });
  }
  if (pageElement) {
    return forceWorkflowDialogEditable(pageElementToFormElement(pageElement, control.required));
  }
  return undefined;
}
