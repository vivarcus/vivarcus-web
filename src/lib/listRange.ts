export function isListFilterActive(filter: string): boolean {
  return filter.trim() !== "";
}

/** Range for server-paginated lists showing loaded rows against server total. */
export function listLoadedRange(loadedCount: number, serverTotal?: number) {
  const total = serverTotal != null && serverTotal >= 0 ? serverTotal : loadedCount;
  return {
    start: loadedCount > 0 ? 1 : 0,
    end: loadedCount,
    total,
  };
}

/** Range for token-based page navigation (page 2 → 26-50 of 100). */
export function listPageRange(
  pageHistoryLength: number,
  pageSize: number,
  recordCount: number,
  serverTotal?: number,
) {
  const pageStart = pageHistoryLength * pageSize + (recordCount > 0 ? 1 : 0);
  const pageEnd = pageHistoryLength * pageSize + recordCount;
  const total = serverTotal != null && serverTotal >= 0 ? serverTotal : recordCount;
  return { start: pageStart, end: pageEnd, total };
}

export function listPageNavigation(pageHistoryLength: number, pageSize: number, serverTotal?: number) {
  const currentPage = pageHistoryLength + 1;
  const totalPages =
    serverTotal != null && serverTotal >= 0 && pageSize > 0
      ? Math.max(1, Math.ceil(serverTotal / pageSize))
      : undefined;
  return { currentPage, totalPages };
}

/** Range when a client-side filter is applied to already-loaded rows. */
export function listFilteredRange(filteredCount: number, loadedCount: number) {
  return {
    count: filteredCount,
    loaded: loadedCount,
  };
}
