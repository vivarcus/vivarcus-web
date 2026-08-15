import { Alert, Select, Spin, Table, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import type { ColumnsType, TableProps } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { TMFViewerModel, TMFViewerTreeNode } from "../api/types";
import {
  ancestorArtifactIds,
  loadTmfViewerPrefs,
  saveTmfViewerPrefs,
} from "../hooks/useTmfViewerPrefs";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { TMFViewerChrome } from "../lib/i18n/chromeTypes";

const TMF_VIEWER_PAGE = "tmf_viewer__v";

export { TMF_VIEWER_PAGE };

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

function scopeOptions(items: { record_id: string; name: string }[] | undefined) {
  return (items ?? []).map((item) => ({
    value: item.record_id,
    label: item.name,
  }));
}

const SORT_FIELD_MAP = {
  name: "name__v",
  document_date: "document_date__v",
  document_number: "document_number__v",
} as const;

type SortColumnKey = keyof typeof SORT_FIELD_MAP;

function sortColumnFromApi(sortBy?: string): SortColumnKey | undefined {
  if (!sortBy) return undefined;
  const entry = Object.entries(SORT_FIELD_MAP).find(([, apiName]) => apiName === sortBy);
  return entry ? (entry[0] as SortColumnKey) : undefined;
}

function artifactLabel(node: TMFViewerTreeNode | undefined) {
  if (!node) return "";
  return node.number ? `${node.number} ${node.name}` : node.name;
}

export function TMFViewerPage() {
  const vaultId = useVaultId();
  const restoredVaultId = useRef<string | null>(null);
  const [model, setModel] = useState<TMFViewerModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | undefined>();
  const [studyCountryId, setStudyCountryId] = useState<string | undefined>();
  const [siteId, setSiteId] = useState<string | undefined>();
  const [viewModelId, setViewModelId] = useState<string | undefined>();
  const [artifactId, setArtifactId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [prefsReady, setPrefsReady] = useState(false);

  const chrome: TMFViewerChrome | undefined = model?.chrome;

  useEffect(() => {
    if (!vaultId) return;
    if (restoredVaultId.current === vaultId) return;
    const prefs = loadTmfViewerPrefs(vaultId);
    setStudyId(prefs.studyId);
    setStudyCountryId(prefs.studyCountryId);
    setSiteId(prefs.siteId);
    setViewModelId(prefs.viewModelId);
    setArtifactId(prefs.artifactId);
    setSortBy(prefs.sortBy);
    setSortDir(prefs.sortDir ?? "asc");
    setExpandedKeys([]);
    restoredVaultId.current = vaultId;
    setPrefsReady(true);
  }, [vaultId]);

  useEffect(() => {
    if (!vaultId || !prefsReady) return;
    saveTmfViewerPrefs(vaultId, {
      studyId,
      studyCountryId,
      siteId,
      viewModelId,
      artifactId,
      sortBy,
      sortDir,
    });
  }, [vaultId, prefsReady, studyId, studyCountryId, siteId, viewModelId, artifactId, sortBy, sortDir]);

  const load = useCallback(async () => {
    if (!vaultId || !prefsReady) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.tmfViewer(vaultId, {
        studyId,
        studyCountryId,
        siteId,
        modelId: viewModelId,
        artifactId,
        sortBy,
        sortDir,
      });
      setModel(next);
      if (!studyId && next.study_id) {
        setStudyId(next.study_id);
      }
      if (!viewModelId && next.model_id) {
        setViewModelId(next.model_id);
      }
      if (!artifactId && next.artifact_id) {
        setArtifactId(next.artifact_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(undefined, "Failed to load TMF Viewer"));
    } finally {
      setLoading(false);
    }
  }, [
    vaultId,
    prefsReady,
    studyId,
    studyCountryId,
    siteId,
    viewModelId,
    artifactId,
    sortBy,
    sortDir,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const nodes = model?.tree.nodes ?? [];
    const selectedId = artifactId ?? model?.artifact_id;
    if (nodes.length === 0) return;

    const parentIds = new Set(
      nodes.map((node) => node.parent_id).filter((id): id is string => Boolean(id)),
    );
    const defaultExpanded = nodes.filter((node) => parentIds.has(node.id)).map((node) => node.id);
    const ancestorExpanded = ancestorArtifactIds(nodes, selectedId);

    setExpandedKeys((current) => {
      if (current.length === 0) {
        return [...new Set([...defaultExpanded, ...ancestorExpanded])];
      }
      if (ancestorExpanded.length === 0) {
        return current;
      }
      return [...new Set([...current, ...ancestorExpanded])];
    });
  }, [model, artifactId]);

  const selectedArtifact = useMemo(() => {
    const nodes = model?.tree.nodes ?? [];
    const selectedId = artifactId ?? model?.artifact_id;
    return nodes.find((node) => node.id === selectedId);
  }, [model, artifactId]);

  const treeData = useMemo<DataNode[]>(() => {
    const nodes = model?.tree.nodes ?? [];
    if (nodes.length === 0) return [];

    const byParent = new Map<string | undefined, typeof nodes>();
    for (const node of nodes) {
      const parentKey = node.parent_id || undefined;
      const siblings = byParent.get(parentKey) ?? [];
      siblings.push(node);
      byParent.set(parentKey, siblings);
    }

    const buildBranch = (parentKey: string | undefined): DataNode[] => {
      const siblings = byParent.get(parentKey) ?? [];
      return siblings.map((node) => {
        const children = buildBranch(node.id);
        const label = node.number ? `${node.number} ${node.name}` : node.name;
        return {
          key: node.id,
          title: (
            <span className="tmf-viewer-page__tree-title">
              <span>{label}</span>
              <span className="tmf-viewer-page__tree-count">{node.document_count}</span>
            </span>
          ),
          children: children.length > 0 ? children : undefined,
          isLeaf: !node.has_children,
        };
      });
    };

    return buildBranch(undefined);
  }, [model?.tree.nodes]);

  const columns = useMemo<ColumnsType<TMFViewerModel["documents"][number]>>(
    () => [
      {
        title: displayText(chrome?.column_document, "Document"),
        dataIndex: "name",
        key: "name",
        sorter: true,
        sortOrder:
          sortColumnFromApi(sortBy) === "name"
            ? sortDir === "desc"
              ? "descend"
              : "ascend"
            : undefined,
        render: (_value, row) => (
          <Link to={row.record_detail_href} className="tmf-viewer-page__doc-link">
            {row.document_number ? `${row.document_number} — ` : ""}
            {row.name}
          </Link>
        ),
      },
      {
        title: displayText(chrome?.column_classification, "Classification"),
        dataIndex: "classification",
        key: "classification",
        render: (value?: string) => value || "—",
      },
      {
        title: displayText(chrome?.column_status, "Status"),
        dataIndex: "status_label",
        key: "status_label",
        render: (value?: string) => value || "—",
      },
      {
        title: displayText(chrome?.column_document_date, "Document Date"),
        dataIndex: "document_date",
        key: "document_date",
        sorter: true,
        sortOrder:
          sortColumnFromApi(sortBy) === "document_date"
            ? sortDir === "desc"
              ? "descend"
              : "ascend"
            : undefined,
        render: (value?: string) => formatDate(value),
      },
      {
        title: displayText(chrome?.column_filing_level, "Filing Level"),
        dataIndex: "filing_level",
        key: "filing_level",
        render: (value?: string) => value || "—",
      },
    ],
    [sortBy, sortDir, chrome],
  );

  const handleTableChange: TableProps<TMFViewerModel["documents"][number]>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    if (Array.isArray(sorter) || !sorter || !sorter.columnKey) {
      return;
    }
    const columnKey = String(sorter.columnKey) as SortColumnKey;
    const apiSortBy = SORT_FIELD_MAP[columnKey];
    if (!apiSortBy) return;
    if (!sorter.order) {
      setSortBy(undefined);
      setSortDir("asc");
      return;
    }
    setSortBy(apiSortBy);
    setSortDir(sorter.order === "descend" ? "desc" : "asc");
  };

  if (!vaultId) {
    return null;
  }

  return (
    <div className="page tmf-viewer-page">
      <header className="page-header tmf-viewer-page__header">
        <div>
          <h1>{displayText(chrome?.title, "TMF Viewer")}</h1>
          <p className="page-header__meta">
            {displayText(
              chrome?.subtitle,
              "Browse study documents by TMF reference model artifact",
            )}
          </p>
        </div>
        <div className="tmf-viewer-page__filters">
          <label className="tmf-viewer-page__filter">
            <span>{displayText(chrome?.filter_study, "Study")}</span>
            <Select
              value={studyId}
              options={scopeOptions(model?.studies)}
              placeholder={displayText(chrome?.select_study, "Select study")}
              loading={loading && !model}
              onChange={(value) => {
                setStudyId(value);
                setStudyCountryId(undefined);
                setSiteId(undefined);
                setArtifactId(undefined);
                setExpandedKeys([]);
              }}
              style={{ minWidth: 220 }}
            />
          </label>
          <label className="tmf-viewer-page__filter">
            <span>{displayText(chrome?.filter_study_country, "Study Country")}</span>
            <Select
              allowClear
              value={studyCountryId}
              options={scopeOptions(model?.study_countries)}
              placeholder={displayText(chrome?.all_countries, "All countries")}
              disabled={!studyId}
              onChange={(value) => {
                setStudyCountryId(value);
                setSiteId(undefined);
                setArtifactId(undefined);
                setExpandedKeys([]);
              }}
              style={{ minWidth: 200 }}
            />
          </label>
          <label className="tmf-viewer-page__filter">
            <span>{displayText(chrome?.filter_study_site, "Study Site")}</span>
            <Select
              allowClear
              value={siteId}
              options={scopeOptions(model?.study_sites)}
              placeholder={displayText(chrome?.all_sites, "All sites")}
              disabled={!studyId}
              onChange={(value) => {
                setSiteId(value);
                setArtifactId(undefined);
                setExpandedKeys([]);
              }}
              style={{ minWidth: 200 }}
            />
          </label>
          <label className="tmf-viewer-page__filter">
            <span>{displayText(chrome?.filter_view_model, "View Model")}</span>
            <Select
              value={viewModelId}
              options={scopeOptions(model?.view_models)}
              placeholder={displayText(chrome?.select_view, "Select view")}
              disabled={!studyId}
              onChange={(value) => {
                setViewModelId(value);
                setArtifactId(undefined);
                setExpandedKeys([]);
              }}
              style={{ minWidth: 220 }}
            />
          </label>
        </div>
      </header>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      {loading && !model ? (
        <div className="tmf-viewer-page__loading">
          <Spin size="large" />
        </div>
      ) : model ? (
        <div className="tmf-viewer-page__body">
          <aside className="tmf-viewer-page__tree-panel">
            <div className="tmf-viewer-page__tree-toolbar">
              <span>
                {displayTextTemplate(chrome?.documents_count, { count: model.total_document_count }, "{count} documents")}
              </span>
              <button
                type="button"
                className="tmf-viewer-page__tree-action"
                disabled={!model.expand_all_allowed || treeData.length === 0}
                onClick={() => setExpandedKeys(model.tree.nodes.map((node) => node.id))}
              >
                {displayText(chrome?.expand_all, "Expand All")}
              </button>
              <button
                type="button"
                className="tmf-viewer-page__tree-action"
                disabled={expandedKeys.length === 0}
                onClick={() => setExpandedKeys([])}
              >
                {displayText(chrome?.collapse_all, "Collapse All")}
              </button>
            </div>
            {treeData.length === 0 ? (
              <p className="tmf-viewer-page__empty">
                {displayText(chrome?.empty_tree, "No mapped documents for this study scope.")}
              </p>
            ) : (
              <Tree
                blockNode
                selectedKeys={artifactId ? [artifactId] : []}
                expandedKeys={expandedKeys}
                treeData={treeData}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                onSelect={(keys) => {
                  const next = keys[0];
                  if (typeof next === "string") {
                    setArtifactId(next);
                  }
                }}
              />
            )}
          </aside>

          <section className="tmf-viewer-page__list-panel">
            <div className="tmf-viewer-page__list-header">
              <h2 className="tmf-viewer-page__list-title">
                {selectedArtifact
                  ? artifactLabel(selectedArtifact)
                  : displayText(chrome?.documents_title, "Documents")}
              </h2>
              <span className="tmf-viewer-page__list-meta">
                {displayTextTemplate(chrome?.shown_count, { count: model.documents.length }, "{count} shown")}
                {selectedArtifact
                  ? ` ${displayTextTemplate(
                      chrome?.in_branch_count,
                      { count: selectedArtifact.document_count },
                      "· {count} in branch",
                    )}`
                  : ""}
              </span>
            </div>
            <Table
              rowKey="record_id"
              size="small"
              pagination={false}
              loading={loading}
              columns={columns}
              dataSource={model.documents}
              onChange={handleTableChange}
              locale={{
                emptyText: displayText(
                  chrome?.empty_documents,
                  "Select an artifact to view documents.",
                ),
              }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
