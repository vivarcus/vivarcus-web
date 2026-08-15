import type { FormElement, FormSection, PicklistEntryOption, RecordFormModel } from "../api/types";

export const DOCUMENT_OBJECT_CLASS = "document";

export function isDocumentObjectClass(objectClass?: string | null): boolean {
  return objectClass?.trim() === DOCUMENT_OBJECT_CLASS;
}

export type DocumentFormSupport = NonNullable<RecordFormModel["document"]>;

export function documentSubtypeOptions(
  support: DocumentFormSupport | undefined,
  typeRecordId: string,
): PicklistEntryOption[] {
  if (!support?.subtype_options_by_type || !typeRecordId) {
    return [];
  }
  return support.subtype_options_by_type[typeRecordId] ?? [];
}

export function documentClassificationOptions(
  support: DocumentFormSupport | undefined,
  subtypeRecordId: string,
): PicklistEntryOption[] {
  if (!support?.classification_options_by_subtype || !subtypeRecordId) {
    return [];
  }
  return support.classification_options_by_subtype[subtypeRecordId] ?? [];
}

function withDocumentReferenceField(
  el: FormElement,
  options: PicklistEntryOption[],
  blockedByParent: boolean,
  controllingFieldApiName?: string,
  emptyOptionsMessage?: string,
): FormElement {
  const fieldRender = {
    ...el.field_render,
    reference_options: options,
  };
  if (controllingFieldApiName) {
    fieldRender.controlling_field_api_name = controllingFieldApiName;
  }
  if (blockedByParent) {
    fieldRender.editability = "readonly";
    // Veeva-aligned "Depends on {label}" comes from ObjectReferenceInput via controlling_field.
    fieldRender.hint = undefined;
    fieldRender.validation_message = undefined;
  } else {
    // Lift the parent-selection gate explicitly; do not inherit stale read_only
    // from layout-rule effects or the previous blocked state.
    fieldRender.editability = "editable";
    if (options.length === 0 && emptyOptionsMessage) {
      fieldRender.hint = [emptyOptionsMessage];
    } else {
      fieldRender.hint = undefined;
    }
    fieldRender.validation_message = undefined;
  }
  return {
    ...el,
    read_only: blockedByParent,
    field_render: fieldRender,
  };
}

export function applyDocumentFormReferenceOptions(
  sections: FormSection[],
  support: DocumentFormSupport | undefined,
  values: Record<string, unknown>,
): FormSection[] {
  if (!support) {
    return sections;
  }
  const typeId = String(values.type__v ?? "");
  const subtypeId = String(values.subtype__v ?? "");
  const subtypeOptions = documentSubtypeOptions(support, typeId);
  const classificationOptions = documentClassificationOptions(support, subtypeId);
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      if (el.field_api_name === "type__v") {
        return withDocumentReferenceField(el, support.type_options ?? [], false);
      }
      if (el.field_api_name === "subtype__v") {
        return withDocumentReferenceField(
          el,
          subtypeOptions,
          !typeId,
          "type__v",
          typeId ? "当前 Type 下暂无 Subtype" : undefined,
        );
      }
      if (el.field_api_name === "classification__v") {
        return withDocumentReferenceField(
          el,
          classificationOptions,
          !subtypeId,
          "subtype__v",
          subtypeId ? "当前 Subtype 下暂无 Classification" : undefined,
        );
      }
      return el;
    }),
  }));
}
