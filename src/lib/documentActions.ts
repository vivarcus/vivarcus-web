import type { SdkAction } from "../api/types";

/** Document download operation names (not Objectactions; gated by document role matrix). */
export const DOCUMENT_DOWNLOAD_ACTIONS = new Set(["download_source__v", "download_rendition__v"]);

/** Document actions that open the source upload dialog before server execute. */
export const DOCUMENT_UPLOAD_ACTIONS = new Set(["checkin__v", "upload_new_version__v"]);

/** Document actions that open the create draft dialog before server execute. */
export const DOCUMENT_CREATE_DRAFT_ACTIONS = new Set(["create_draft__v"]);

/** Actions rendered in the document viewer toolbar (`document_page__v`). */
export const DOCUMENT_TOOLBAR_ACTION_NAMES = [
  "download_source__v",
  "download_rendition__v",
  "checkout__v",
  "undo_checkout__v",
  "checkin__v",
  "upload_new_version__v",
] as const;

export const DOCUMENT_TOOLBAR_ACTIONS = new Set<string>(DOCUMENT_TOOLBAR_ACTION_NAMES);

export function isDocumentDownloadAction(actionName: string): boolean {
  return DOCUMENT_DOWNLOAD_ACTIONS.has(actionName);
}

export function isDocumentUploadAction(actionName: string): boolean {
  return DOCUMENT_UPLOAD_ACTIONS.has(actionName);
}

export function isDocumentCreateDraftAction(actionName: string): boolean {
  return DOCUMENT_CREATE_DRAFT_ACTIONS.has(actionName);
}

export function isDocumentClientAction(actionName: string): boolean {
  return (
    isDocumentDownloadAction(actionName) ||
    isDocumentUploadAction(actionName) ||
    isDocumentCreateDraftAction(actionName)
  );
}

export function isDocumentToolbarAction(actionName: string): boolean {
  return DOCUMENT_TOOLBAR_ACTIONS.has(actionName);
}

export function findSdkAction(actions: SdkAction[] | undefined, name: string): SdkAction | undefined {
  return actions?.find((action) => action.name === name);
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "download";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
