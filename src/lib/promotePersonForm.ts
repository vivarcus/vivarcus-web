import type { RecordPageModel } from "../api/types";
import { withNavTrail } from "./navTrail";

function fieldValueFromPage(page: RecordPageModel, fieldAPIName: string): unknown {
  for (const section of page.sections) {
    for (const element of section.elements) {
      if (element.field_api_name === fieldAPIName) {
        return element.value;
      }
    }
  }
  return undefined;
}

function copyStringField(
  out: Record<string, unknown>,
  page: RecordPageModel,
  fieldAPIName: string,
) {
  const value = fieldValueFromPage(page, fieldAPIName);
  if (typeof value === "string" && value.trim()) {
    out[fieldAPIName] = value.trim();
  }
}

/** Prefill user__sys create values from a person__sys record page. */
export function prefillUserFieldsFromPerson(page: RecordPageModel): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of [
    "name__v",
    "first_name__sys",
    "last_name__sys",
    "email__sys",
    "language__sys",
    "locale__sys",
    "timezone__sys",
    "image__sys",
    "mobile_phone__sys",
  ]) {
    copyStringField(out, page, field);
  }
  const city = fieldValueFromPage(page, "city__c");
  if (typeof city === "string" && city.trim()) {
    out.location__sys = city.trim();
  }
  return out;
}

export function isPromotePersonToUserDialog(objectApiName: string | undefined): boolean {
  return objectApiName === "user__sys";
}

const userCreateObject = "user__sys";

/** SPA route for promote-to-user: full user create page with person prefill. */
export function buildPromotePersonToUserHref(
  personRecordId: string,
  lifecycleActionName: string,
  opts?: { navTrail?: string; tab?: string },
): string {
  const params = new URLSearchParams();
  params.set("promote_from", personRecordId);
  params.set("lifecycle_action", lifecycleActionName);
  if (opts?.tab) params.set("tab", opts.tab);
  const href = `/objects/${encodeURIComponent(userCreateObject)}/create?${params}`;
  return withNavTrail(href, opts?.navTrail ?? "");
}
