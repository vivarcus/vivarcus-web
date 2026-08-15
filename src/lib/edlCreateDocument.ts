import type { RecordPageModel } from "../api/types";
import { DEFAULT_SEARCH_TAB } from "./globalSearchTab";
import { buildListCreateHref } from "./listRouting";
import { FORM_PREFILL_DISPLAY_PREFIX } from "./formPrefill";
import { NAV_TRAIL_PARAM, encodeNavTrail } from "./navTrail";

/**
 * Library Tab for document create.
 * Aligns with Create-mode Tab routing (`document_tab_create_pagelink__v`),
 * not View-mode `document_page__v` (viewer shell).
 */
export const EDL_DOCUMENT_CREATE_TAB = DEFAULT_SEARCH_TAB;
/** Default document object type for Library create (Base Document). */
export const EDL_DOCUMENT_CREATE_OBJECT_TYPE = "base__v";

/** Fields copied from an Expected Document into document create prefill. */
export const EDL_CREATE_DOCUMENT_PREFILL_FIELDS = [
  "study__v",
  "study_country__v",
  "site__v",
  "study_person__v",
  "study_organization__v",
  "study_product__v",
  "type__v",
  "subtype__v",
  "classification__v",
  "owning_milestone__v",
  "artifact__v",
  "name__v",
] as const;

function fieldElementFromPage(page: RecordPageModel, fieldAPIName: string) {
  for (const section of page.sections) {
    for (const element of section.elements) {
      if (element.field_api_name === fieldAPIName) {
        return element;
      }
    }
  }
  return undefined;
}

function fieldValueFromPage(page: RecordPageModel, fieldAPIName: string): unknown {
  return fieldElementFromPage(page, fieldAPIName)?.value;
}

function fieldDisplayFromPage(page: RecordPageModel, fieldAPIName: string): string {
  const displayValue = fieldElementFromPage(page, fieldAPIName)?.field_render?.display_value;
  if (displayValue == null) {
    return "";
  }
  const text = String(displayValue).trim();
  return text;
}

function stringifyPrefill(raw: unknown): string {
  if (raw == null) {
    return "";
  }
  if (typeof raw === "string") {
    return raw.trim();
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    const id = (raw as { id?: unknown }).id;
    return typeof id === "string" ? id.trim() : "";
  }
  return "";
}

export type EdlCreateDocumentHrefOptions = {
  /**
   * Encoded nav trail (see `lib/navTrail`) whose newest hop is the originating
   * EDL Item. Defaults to a single hop pointing at the EDL Item detail page.
   */
  navTrail?: string;
};

/**
 * Builds Library Create Document href with EDL Item field prefill.
 * Uses Tab Create routing (`tab` + `object_type`) — same as Vault Create / Library +.
 * Must not set `page=document_page__v` (that is View pagelink / Binder viewer create).
 */
export function buildEdlCreateDocumentHref(
  edlItemId: string,
  page: RecordPageModel,
  opts?: EdlCreateDocumentHrefOptions,
): string {
  // No list_routing.create.page: Create pagelink intentionally omits document_page__v.
  const base = buildListCreateHref(
    "document__v",
    EDL_DOCUMENT_CREATE_TAB,
    EDL_DOCUMENT_CREATE_OBJECT_TYPE,
  );
  const q = new URLSearchParams(base.split("?")[1] ?? "");
  const navTrail =
    opts?.navTrail ||
    encodeNavTrail([
      {
        href: `/objects/edl_item__v/records/${encodeURIComponent(edlItemId)}`,
        label: page.record_name?.trim() || edlItemId,
      },
    ]);
  q.set(NAV_TRAIL_PARAM, navTrail);
  for (const field of EDL_CREATE_DOCUMENT_PREFILL_FIELDS) {
    const value = stringifyPrefill(fieldValueFromPage(page, field));
    if (value) {
      q.set(`prefill.${field}`, value);
      const display = fieldDisplayFromPage(page, field);
      if (display && display !== value) {
        q.set(`${FORM_PREFILL_DISPLAY_PREFIX}${field}`, display);
      }
    }
  }
  return `/objects/document__v/create?${q.toString()}`;
}

export function isEdlCreateDocumentAction(actionName: string, objectName: string): boolean {
  return objectName === "edl_item__v" && actionName === "create_document__sys";
}
