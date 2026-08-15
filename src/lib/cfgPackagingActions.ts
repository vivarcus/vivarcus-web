import type { RecordPageModel } from "../api/types";

export const CFG_EXPORT_ACTION = "export__sys";
export const CFG_VALIDATE_ACTION = "validate__sys";
export const CFG_REVIEW_DEPLOY_ACTION = "review_and_deploy__sys";

export function isCfgExportAction(actionName: string, objectName: string): boolean {
  return objectName === "outbound_package__v" && actionName === CFG_EXPORT_ACTION;
}

export function isCfgValidateAction(actionName: string, objectName: string): boolean {
  return objectName === "vault_package__v" && actionName === CFG_VALIDATE_ACTION;
}

export function isCfgReviewDeployAction(actionName: string, objectName: string): boolean {
  return objectName === "vault_package__v" && actionName === CFG_REVIEW_DEPLOY_ACTION;
}

export function buildReviewDeployHref(recordId: string): string {
  return `/admin/deployment/review_deploy/${encodeURIComponent(recordId)}`;
}

function fieldValueFromPage(page: RecordPageModel, fieldAPIName: string): unknown {
  for (const section of page.sections ?? []) {
    for (const element of section.elements ?? []) {
      if (element.field_api_name === fieldAPIName) {
        return element.value;
      }
    }
  }
  return undefined;
}

export function outboundExportMeta(page: RecordPageModel): { name?: string; summary?: string } {
  const name = fieldValueFromPage(page, "name__v");
  const summary = fieldValueFromPage(page, "summary__v");
  return {
    name: name == null ? undefined : String(name),
    summary: summary == null ? undefined : String(summary),
  };
}
