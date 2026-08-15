import type { ListRouting } from "../api/types";

export function buildListRecordHref(
  objectApiName: string,
  recordId: string,
  tabApiName: string,
  routing?: ListRouting | null,
): string {
  const params = new URLSearchParams({ tab: tabApiName });
  const pageApiName = routing?.view?.page_api_name?.trim();
  if (pageApiName) {
    params.set("page", pageApiName);
  }
  return `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}?${params}`;
}

export function buildListCreateHref(
  objectApiName: string,
  tabApiName: string,
  objectType?: string,
  routing?: ListRouting | null,
): string {
  const params = new URLSearchParams({ tab: tabApiName });
  if (objectType) {
    params.set("object_type", objectType);
  }
  const pageApiName = routing?.create?.page_api_name?.trim();
  if (pageApiName) {
    params.set("page", pageApiName);
  }
  return `/objects/${encodeURIComponent(objectApiName)}/create?${params}`;
}
