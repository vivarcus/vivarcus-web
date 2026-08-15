import { useCallback, useEffect, useRef, useState } from "react";
import type { ObjectListModel } from "../api/types";
import { hasFacetFilters, type FacetFilters, type FacetFilterSpec, EMPTY_FACET_FILTERS, facetFiltersEqual, normalizeFacetFilters, normalizeFacetFilterSpec, facetFilterSpecIsEmpty } from "../lib/facetFilters";
import { defaultListChrome } from "../lib/i18n";
import {
  deriveObjectListPagination,
  sortStateFromListResponse,
  toggleListColumnSort,
  type ObjectListQuery,
} from "../lib/objectListPage";

type InitialFilter = {
  filter?: string;
  filterField?: string;
  facetFilters?: FacetFilters;
  facetFiltersKey?: string;
};

type Options = {
  scopeKey: string | undefined;
  vaultId: string | undefined;
  initialFilter?: InitialFilter;
  /** When set, keyword draft debounces into a broad column search (no filter_field). */
  debounceKeywordMs?: number;
  fetchList: (query: ObjectListQuery) => Promise<ObjectListModel>;
  onFetchError?: (
    error: unknown,
    retry: () => Promise<void>,
    setErrorMessage: (message: string | null) => void,
  ) => Promise<void>;
  persistView?: (viewId: string) => Promise<void>;
};

export function useObjectListState({
  scopeKey,
  vaultId,
  initialFilter,
  debounceKeywordMs,
  fetchList,
  onFetchError,
  persistView,
}: Options) {
  const [model, setModel] = useState<ObjectListModel | null>(null);
  const [view, setView] = useState<string | undefined>();
  const [viewPinned, setViewPinned] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Seed from URL/?q= so the first fetch is already filtered (avoids a race
  // where an empty-filter response overwrites a later keyword search).
  const [filter, setFilter] = useState(() => initialFilter?.filter ?? "");
  const [filterField, setFilterField] = useState(() => initialFilter?.filterField ?? "");
  const [filterDraft, setFilterDraft] = useState(() => initialFilter?.filter ?? "");
  const [filterFieldDraft, setFilterFieldDraft] = useState(() => initialFilter?.filterField ?? "");
  const [facetFilters, setFacetFilters] = useState<FacetFilters>(() =>
    normalizeFacetFilters(initialFilter?.facetFilters),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);

  const facetFiltersByViewRef = useRef<Record<string, FacetFilters>>({});
  const viewRef = useRef(view);
  const facetFiltersRef = useRef(facetFilters);
  viewRef.current = view;
  facetFiltersRef.current = facetFilters;

  const chrome = { ...defaultListChrome, ...(model?.chrome ?? {}) };

  const currentQuery = useCallback(
    (overrides: Partial<ObjectListQuery> = {}): ObjectListQuery => ({
      view: viewPinned ? view : undefined,
      pageToken,
      pageSize,
      sortBy,
      sortDir,
      filter: filter || undefined,
      filterField: filterField || undefined,
      facetFilters: hasFacetFilters(facetFilters) ? facetFilters : undefined,
      ...overrides,
    }),
    [view, viewPinned, pageToken, pageSize, sortBy, sortDir, filter, filterField, facetFilters],
  );

  const load = useCallback(
    async (query: ObjectListQuery) => {
      if (!vaultId || !scopeKey) return;
      const seq = ++loadSeq.current;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchList(query);
        if (seq !== loadSeq.current) return;
        setModel(data);
        setView(data.selected_view);
        setPageToken(query.pageToken);
        const nextSort = sortStateFromListResponse(query, data.list_controls);
        setSortBy(nextSort.sortBy);
        setSortDir(nextSort.sortDir);
        const controls = data.list_controls;
        setFilter(controls?.filter ?? "");
        setFilterField(controls?.filter_field ?? "");
        setFilterDraft(controls?.filter ?? "");
        setFilterFieldDraft(controls?.filter_field ?? "");
        const nextFacetFilters = normalizeFacetFilters(controls?.facet_filters);
        setFacetFilters((prev) =>
          facetFiltersEqual(prev, nextFacetFilters) ? prev : nextFacetFilters,
        );
      } catch (err) {
        if (seq !== loadSeq.current) return;
        if (onFetchError) {
          await onFetchError(err, () => load(query), setError);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load records");
          setModel(null);
        }
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
        }
      }
    },
    [vaultId, scopeKey, fetchList, onFetchError],
  );

  useEffect(() => {
    setViewPinned(false);
    setView(undefined);
    setPageToken(undefined);
    setPageHistory([]);
    facetFiltersByViewRef.current = {};
    setFilter(initialFilter?.filter ?? "");
    setFilterField(initialFilter?.filterField ?? "");
    setFilterDraft(initialFilter?.filter ?? "");
    setFilterFieldDraft(initialFilter?.filterField ?? "");
    setFacetFilters(normalizeFacetFilters(initialFilter?.facetFilters));
    // Only reset list shell when vault/tab scope changes — not when URL facet_filters syncs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional scope-only reset
  }, [vaultId, scopeKey]);

  useEffect(() => {
    setFilter(initialFilter?.filter ?? "");
    setFilterField(initialFilter?.filterField ?? "");
    setFilterDraft(initialFilter?.filter ?? "");
    setFilterFieldDraft(initialFilter?.filterField ?? "");
  }, [initialFilter?.filter, initialFilter?.filterField]);

  useEffect(() => {
    const nextFacetFilters = normalizeFacetFilters(initialFilter?.facetFilters);
    setFacetFilters((prev) =>
      facetFiltersEqual(prev, nextFacetFilters) ? prev : nextFacetFilters,
    );
  }, [initialFilter?.facetFiltersKey]);

  // Only the query-effective view should retrigger loads. Server echoes of
  // selected_view (viewPinned=false) must not fan out a second identical compose.
  const listView = viewPinned ? view : undefined;

  useEffect(() => {
    setPageToken(undefined);
    setPageHistory([]);
  }, [listView, sortBy, sortDir, filter, filterField, facetFilters, pageSize]);

  useEffect(() => {
    void load(currentQuery({ pageToken: undefined }));
  }, [load, listView, sortBy, sortDir, filter, filterField, facetFilters, pageSize]);

  useEffect(() => {
    if (!debounceKeywordMs || debounceKeywordMs <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      const next = filterDraft.trim();
      setFilter((prev) => (prev === next ? prev : next));
      setFilterField((prev) => (prev === "" ? prev : ""));
    }, debounceKeywordMs);
    return () => window.clearTimeout(timer);
  }, [filterDraft, debounceKeywordMs]);

  const pagination = deriveObjectListPagination(model, view, pageHistory);

  function selectView(nextView: string) {
    if (!vaultId || !scopeKey) return;
    const currentView = viewRef.current;
    if (currentView) {
      facetFiltersByViewRef.current[currentView] = normalizeFacetFilters(
        facetFiltersRef.current,
      );
    }
    const remembered = facetFiltersByViewRef.current[nextView];
    const nextFacets = remembered
      ? normalizeFacetFilters(remembered)
      : EMPTY_FACET_FILTERS;
    setFacetFilters((prev) => (facetFiltersEqual(prev, nextFacets) ? prev : nextFacets));
    setViewPinned(true);
    setView(nextView);
    void persistView?.(nextView).catch(() => undefined);
  }

  function applyKeywordFilter() {
    setFilter(filterDraft.trim());
    setFilterField(filterFieldDraft);
  }

  function clearKeywordFilter() {
    setFilterDraft("");
    setFilterFieldDraft("");
    setFilter("");
    setFilterField("");
  }

  function clearFilter() {
    clearKeywordFilter();
    setFacetFilters((prev) =>
      facetFiltersEqual(prev, EMPTY_FACET_FILTERS) ? prev : EMPTY_FACET_FILTERS,
    );
  }

  function setFacetFieldFilter(fieldApiName: string, filter: FacetFilterSpec) {
    setFacetFilters((prev) => {
      const next = { ...prev };
      const normalized = normalizeFacetFilterSpec(filter);
      if (facetFilterSpecIsEmpty(normalized)) {
        delete next[fieldApiName];
      } else {
        next[fieldApiName] = normalized;
      }
      return next;
    });
  }

  function clearFacetField(fieldApiName: string) {
    setFacetFieldFilter(fieldApiName, {});
  }

  function toggleSort(field: string) {
    const next = toggleListColumnSort(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  }

  function goFirstPage() {
    setPageHistory([]);
    setPageToken(undefined);
    void load(currentQuery({ pageToken: undefined }));
  }

  function goPreviousPage() {
    if (pageHistory.length === 0) return;
    const history = [...pageHistory];
    const previousToken = history.pop();
    setPageHistory(history);
    const token = previousToken || undefined;
    setPageToken(token);
    void load(currentQuery({ pageToken: token }));
  }

  function goNextPage() {
    if (!pagination.nextToken) return;
    setPageHistory((prev) => [...prev, pageToken ?? ""]);
    setPageToken(pagination.nextToken);
    void load(currentQuery({ pageToken: pagination.nextToken }));
  }

  function reload(overrides: Partial<ObjectListQuery> = {}) {
    void load(currentQuery({ pageToken: undefined, ...overrides }));
  }

  function goToPage(targetPage: number) {
    if (!model) return;
    const currentPage = pageHistory.length + 1;
    let target = Math.max(1, Math.trunc(targetPage));
    const maxPage =
      model.pagination.total >= 0 && pageSize > 0
        ? Math.max(1, Math.ceil(model.pagination.total / pageSize))
        : undefined;
    if (maxPage != null) {
      target = Math.min(maxPage, target);
    }
    if (target === currentPage) return;

    if (target < currentPage) {
      const token = target === 1 ? undefined : pageHistory[target - 1];
      const newHistory = target === 1 ? [] : pageHistory.slice(0, target - 1);
      setPageHistory(newHistory);
      setPageToken(token);
      void load(currentQuery({ pageToken: token }));
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        let history = [...pageHistory];
        let token: string | undefined = pageToken;
        let page = currentPage;
        let data = model;
        while (page < target) {
          const next = data.pagination.next_page_token;
          if (!next) break;
          history = [...history, token ?? ""];
          token = next;
          data = await fetchList(
            currentQuery({
              pageToken: token,
            }),
          );
          page += 1;
        }
        setModel(data);
        setView(data.selected_view);
        setPageHistory(history);
        setPageToken(token);
        const pageQuery = currentQuery({ pageToken: token });
        const nextSort = sortStateFromListResponse(pageQuery, data.list_controls);
        setSortBy(nextSort.sortBy);
        setSortDir(nextSort.sortDir);
        const controls = data.list_controls;
        setFilter(controls?.filter ?? "");
        setFilterField(controls?.filter_field ?? "");
        setFilterDraft(controls?.filter ?? "");
        setFilterFieldDraft(controls?.filter_field ?? "");
        const nextFacetFilters = normalizeFacetFilters(controls?.facet_filters);
        setFacetFilters((prev) =>
          facetFiltersEqual(prev, nextFacetFilters) ? prev : nextFacetFilters,
        );
      } catch (err) {
        if (onFetchError) {
          await onFetchError(err, () => goToPage(target), setError);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load records");
        }
      } finally {
        setLoading(false);
      }
    })();
  }

  return {
    model,
    loading,
    error,
    setError,
    chrome,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    filter,
    filterField,
    filterDraft,
    setFilterDraft,
    filterFieldDraft,
    setFilterFieldDraft,
    facetFilters,
    setFacetFieldFilter,
    clearFacetField,
    pagination,
    canGoPrevious: pageHistory.length > 0,
    selectView,
    applyKeywordFilter,
    clearKeywordFilter,
    clearFilter,
    toggleSort,
    goFirstPage,
    goPreviousPage,
    goNextPage,
    goToPage,
    reload,
    currentQuery,
    load,
  };
}
