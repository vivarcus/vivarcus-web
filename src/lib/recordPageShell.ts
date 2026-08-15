export const DOCUMENT_PAGE_API_NAME = "document_page__v";
export const OBJECT_RECORD_PAGE_API_NAME = "object_record_page__v";

type RecordPageQuery = {
  layout?: string;
  tab?: string;
  page?: string;
};

export function isBinderObjectType(objectTypeApiName?: string | null): boolean {
  const name = (objectTypeApiName ?? "").trim();
  return name === "binder__v" || name === "document__v.binder__v";
}

export function buildRecordDetailHref(
  objectName: string,
  recordId: string,
  query: RecordPageQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.layout) {
    params.set("layout", query.layout);
  }
  if (query.tab) {
    params.set("tab", query.tab);
  }
  if (query.page) {
    params.set("page", query.page);
  }
  const suffix = params.toString() ? `?${params}` : "";
  return `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}${suffix}`;
}

/** Toggle document/binder specialty shells ↔ standard object record page. */
export function documentPageShellQuery(
  layout: string | undefined,
  tabApiName: string | undefined,
  pageApiName: string | undefined,
): RecordPageQuery {
  return {
    layout,
    tab: tabApiName,
    page: pageApiName === OBJECT_RECORD_PAGE_API_NAME ? DOCUMENT_PAGE_API_NAME : OBJECT_RECORD_PAGE_API_NAME,
  };
}
