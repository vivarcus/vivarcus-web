const lastTabKey = (vaultId: string) => `vivarcus.tab.${vaultId}`;
const lastCollectionKey = (vaultId: string) => `vivarcus.collection.${vaultId}`;

export function saveLastTab(vaultId: string, tabApiName: string) {
  sessionStorage.setItem(lastTabKey(vaultId), tabApiName);
}

export function getLastTab(vaultId: string): string | undefined {
  return sessionStorage.getItem(lastTabKey(vaultId)) ?? undefined;
}

export function saveLastCollection(vaultId: string, collectionApiName: string) {
  sessionStorage.setItem(lastCollectionKey(vaultId), collectionApiName);
}

export function getLastCollection(vaultId: string): string | undefined {
  return sessionStorage.getItem(lastCollectionKey(vaultId)) ?? undefined;
}

export type RecordNavState = {
  tabApiName?: string;
  tabLabel?: string;
  objectLabel?: string;
  recordDisplayName?: string;
  recordIndex?: number;
  recordTotal?: number;
  /** 1-based absolute index of pageRecordIds[0] within the full list. */
  pageStart?: number;
  pageRecordIds?: string[];
  recordPageRefresh?: boolean;
};

/** List-page context used to seed record detail prev/next navigation. */
export type ListRecordNavContext = {
  pageRecordIds: string[];
  /** Absolute 1-based index of the first row on the current page; 0/undefined → treat as 1. */
  pageStart?: number;
  recordTotal: number;
  tabApiName?: string;
  tabLabel?: string;
  objectLabel?: string;
};

function normalizeRecordId(recordId: string | number | undefined | null): string {
  return recordId == null ? "" : String(recordId);
}

/** Build React Router location state so the detail toolbar can show list position + prev/next. */
export function buildRecordNavState(
  ctx: ListRecordNavContext,
  recordId: string,
): RecordNavState | undefined {
  const pageRecordIds = ctx.pageRecordIds.map(normalizeRecordId).filter(Boolean);
  if (!pageRecordIds.length || ctx.recordTotal <= 0) {
    return undefined;
  }
  const targetId = normalizeRecordId(recordId);
  const indexInPage = pageRecordIds.indexOf(targetId);
  if (indexInPage < 0) {
    return undefined;
  }
  const pageStart = ctx.pageStart && ctx.pageStart > 0 ? ctx.pageStart : 1;
  return {
    tabApiName: ctx.tabApiName,
    tabLabel: ctx.tabLabel,
    objectLabel: ctx.objectLabel,
    recordIndex: pageStart + indexInPage,
    recordTotal: ctx.recordTotal,
    pageStart,
    pageRecordIds,
  };
}

/** Resolve neighbors and absolute index within a list-nav state snapshot. */
export function resolveListRecordNav(
  state: Pick<RecordNavState, "pageRecordIds" | "pageStart" | "recordIndex" | "recordTotal">,
  recordId: string,
): {
  pageRecordIds: string[];
  pageStart: number;
  indexInPage: number;
  recordIndex?: number;
  prevRecordId?: string;
  nextRecordId?: string;
} {
  const pageRecordIds = (state.pageRecordIds ?? []).map(normalizeRecordId).filter(Boolean);
  const pageStart = state.pageStart && state.pageStart > 0 ? state.pageStart : 1;
  const indexInPage = pageRecordIds.indexOf(normalizeRecordId(recordId));
  if (indexInPage < 0) {
    return { pageRecordIds, pageStart, indexInPage: -1, recordIndex: state.recordIndex };
  }
  return {
    pageRecordIds,
    pageStart,
    indexInPage,
    recordIndex: pageStart + indexInPage,
    prevRecordId: indexInPage > 0 ? pageRecordIds[indexInPage - 1] : undefined,
    nextRecordId:
      indexInPage < pageRecordIds.length - 1 ? pageRecordIds[indexInPage + 1] : undefined,
  };
}
