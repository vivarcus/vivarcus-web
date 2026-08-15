import type { DocumentViewerCheckout } from "../api/types";

/** Standalone upload/import (toolbar, empty state, sync) — blocked while checked out. */
export function canUploadSourceOutsideCheckin(
  checkout: DocumentViewerCheckout | null | undefined,
): boolean {
  return checkout?.locked !== true;
}

/** Check-in dialog upload/import — only while checked out by the current user. */
export function canUploadSourceViaCheckin(
  checkout: DocumentViewerCheckout | null | undefined,
): boolean {
  return checkout?.locked === true && checkout.locked_by_me === true;
}

export function isCheckinSourceUpload(actionName: string | undefined): boolean {
  return actionName === "checkin__v";
}

export function viaCheckinUpload(
  checkout: DocumentViewerCheckout | null | undefined,
  actionName: string | undefined,
): boolean {
  return canUploadSourceViaCheckin(checkout) && isCheckinSourceUpload(actionName);
}

type DocumentPageRefreshInput = {
  state_api_name?: string;
  record_version: number;
  document_header?: {
    major_version_number?: number;
    minor_version_number?: number;
    checkout?: DocumentViewerCheckout;
  };
};

/** Bumps when record page checkout or version fields change so the viewer reloads. */
export function documentViewerRefreshKey(
  page: DocumentPageRefreshInput | null | undefined,
): string | undefined {
  if (!page) {
    return undefined;
  }
  const checkout = page.document_header?.checkout;
  const checkoutKey = checkout?.locked
    ? checkout.locked_by_me
      ? "checkout:self"
      : "checkout:other"
    : "checkout:none";
  return [
    page.state_api_name ?? "",
    page.record_version,
    page.document_header?.major_version_number,
    page.document_header?.minor_version_number,
    checkoutKey,
  ].join(":");
}
