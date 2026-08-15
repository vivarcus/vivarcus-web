import { Alert, Input, Select, Table, Tree } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MilestoneWorkspaceDocumentTypeNode,
  MilestoneWorkspaceIcon,
  MilestoneWorkspaceItem,
  MilestoneWorkspaceModel,
} from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { MilestoneWorkspaceChrome } from "../lib/i18n/chromeTypes";
import {
  NAV_TRAIL_PARAM,
  decodeNavTrail,
  navTrailBackHref,
  pushNavTrail,
  withNavTrail,
} from "../lib/navTrail";
import { FormulaIcon } from "../renderers/formulaIcon";
import "../styles/pages/milestone-workspace-page.css";

const MILESTONE_WORKSPACE_PAGE = "milestone_workspace__v";
const TREE_ROOT_KEY = "root";

export { MILESTONE_WORKSPACE_PAGE };

function dash(value?: string | null) {
  const text = (value ?? "").trim();
  return text || "—";
}

/** Normalize URL / Select values: trim whitespace and treat empty as cleared. */
function filterParam(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed || undefined;
}

function CompletenessStatusCell({ icon }: { icon?: MilestoneWorkspaceIcon }) {
  if (!icon?.name) {
    return <span className="milestone-workspace-page__icon-empty">—</span>;
  }
  return (
    <span className="field-icon" title={icon.title || icon.name} aria-label={icon.title || icon.name}>
      <FormulaIcon name={icon.name} color={icon.color} />
    </span>
  );
}

function typeTreeKey(typeId: string) {
  return `type:${typeId}`;
}

function subtypeTreeKey(typeId: string, subtypeId: string) {
  return `subtype:${typeId}:${subtypeId}`;
}

function parseTreeKey(key: string): { type?: string; subtype?: string } {
  if (key === TREE_ROOT_KEY || !key) return {};
  if (key.startsWith("subtype:")) {
    const rest = key.slice("subtype:".length);
    const idx = rest.indexOf(":");
    if (idx <= 0) return {};
    return { type: rest.slice(0, idx), subtype: rest.slice(idx + 1) };
  }
  if (key.startsWith("type:")) {
    return { type: key.slice("type:".length) };
  }
  return {};
}

function buildDocumentTypeTreeData(
  scopeLabel: string,
  documentTypes: MilestoneWorkspaceDocumentTypeNode[],
): DataNode[] {
  return [
    {
      key: TREE_ROOT_KEY,
      title: scopeLabel,
      children: documentTypes.map((typeNode) => ({
        key: typeTreeKey(typeNode.value),
        title: typeNode.label,
        children: (typeNode.subtypes ?? []).map((sub) => ({
          key: subtypeTreeKey(typeNode.value, sub.value),
          title: sub.label,
          isLeaf: true,
        })),
      })),
    },
  ];
}

/** Measure table-host for Ant Design scroll.y so header stays pinned in the pane. */
function useTableHostScrollY() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState<number>();

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const header = host.querySelector<HTMLElement>(".ant-table-header");
      const headerH = header?.offsetHeight ?? 39;
      const next = Math.max(120, Math.floor(host.clientHeight - headerH));
      setScrollY((prev) => (prev === next ? prev : next));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => measure());
    observer.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return { hostRef, scrollY };
}

export function MilestoneWorkspacePage() {
  const vaultId = useVaultId();
  const [searchParams, setSearchParams] = useSearchParams();
  const milestoneId = (searchParams.get("milestone") ?? "").trim();
  const navTrailParam = searchParams.get(NAV_TRAIL_PARAM) ?? "";
  const navTrailHops = useMemo(() => decodeNavTrail(navTrailParam), [navTrailParam]);

  const [model, setModel] = useState<MilestoneWorkspaceModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState(() => filterParam(searchParams.get("department")));
  const [completeness, setCompleteness] = useState(() => filterParam(searchParams.get("completeness")));
  const [requiredness, setRequiredness] = useState(() => filterParam(searchParams.get("requiredness")));
  const [docType, setDocType] = useState(() => filterParam(searchParams.get("type")));
  const [docSubtype, setDocSubtype] = useState(() => filterParam(searchParams.get("subtype")));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [appliedQuery, setAppliedQuery] = useState(() => (searchParams.get("q") ?? "").trim());
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
    const keys = [TREE_ROOT_KEY];
    const type = filterParam(searchParams.get("type"));
    if (type) keys.push(typeTreeKey(type));
    return keys;
  });

  const chrome: MilestoneWorkspaceChrome | undefined = model?.chrome;
  const { hostRef, scrollY } = useTableHostScrollY();

  /** Trail handed to Expected Document rows so they can lead back here. */
  const itemNavTrail = useMemo(
    () =>
      pushNavTrail(`?${searchParams}`, {
        pathname: `/pages/${MILESTONE_WORKSPACE_PAGE}`,
        // The Milestone record is usually the hop right before this one, so name
        // the page rather than repeating the Milestone name.
        label: displayText(chrome?.title) || "Milestone Workspace",
      }),
    [searchParams, chrome?.title],
  );

  const syncParams = useCallback(
    (next: {
      department?: string;
      completeness?: string;
      requiredness?: string;
      type?: string;
      subtype?: string;
      q?: string;
    }) => {
      const params = new URLSearchParams(searchParams);
      if (milestoneId) params.set("milestone", milestoneId);
      const setOrDelete = (key: string, value?: string) => {
        const trimmed = (value ?? "").trim();
        if (trimmed) params.set(key, trimmed);
        else params.delete(key);
      };
      setOrDelete("department", next.department);
      setOrDelete("completeness", next.completeness);
      setOrDelete("requiredness", next.requiredness);
      setOrDelete("type", next.type);
      setOrDelete("subtype", next.subtype);
      setOrDelete("q", next.q);
      setSearchParams(params, { replace: true });
    },
    [milestoneId, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!vaultId || !milestoneId) {
      setLoading(false);
      setError("Milestone is required");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .milestoneWorkspace(vaultId, {
        milestone: milestoneId,
        department,
        completeness,
        requiredness,
        type: docType,
        subtype: docSubtype,
        q: appliedQuery.trim() || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setModel(res);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || displayText(chrome?.load_failed) || "Failed to load Milestone Workspace");
        setModel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // chrome is only used for fallback error text; omit to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, milestoneId, department, completeness, requiredness, docType, docSubtype, appliedQuery]);

  const columns = useMemo<ColumnsType<MilestoneWorkspaceItem>>(() => {
    return [
      {
        title: displayText(chrome?.column_expected_document),
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        defaultSortOrder: "ascend",
        render: (_value, row) => (
          <Link
            className="milestone-workspace-page__name-link"
            to={withNavTrail(row.record_detail_href, itemNavTrail)}
          >
            {row.name}
          </Link>
        ),
      },
      {
        title: displayText(chrome?.column_completeness_status),
        dataIndex: "completeness_icon",
        key: "completeness_icon",
        width: 88,
        align: "center",
        render: (value?: MilestoneWorkspaceIcon) => <CompletenessStatusCell icon={value} />,
      },
      {
        title: displayText(chrome?.column_level),
        dataIndex: "level",
        key: "level",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_document_type),
        dataIndex: "document_type",
        key: "document_type",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_document_subtype),
        dataIndex: "document_subtype",
        key: "document_subtype",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_classification),
        dataIndex: "document_classification",
        key: "document_classification",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_requiredness),
        dataIndex: "requiredness_label",
        key: "requiredness",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_expected_count),
        dataIndex: "expected_count",
        key: "expected_count",
        align: "right",
        width: 96,
      },
      {
        title: displayText(chrome?.column_steady_state_count),
        dataIndex: "steady_state_doc_count",
        key: "steady_state_doc_count",
        align: "right",
        width: 120,
      },
      {
        title: displayText(chrome?.column_all_doc_count),
        dataIndex: "all_doc_count",
        key: "all_doc_count",
        align: "right",
        width: 110,
      },
      {
        title: displayText(chrome?.column_completeness),
        dataIndex: "completeness_label",
        key: "completeness",
        render: (value?: string) => dash(value),
      },
      {
        title: displayText(chrome?.column_study),
        dataIndex: "study_name",
        key: "study",
        render: (value?: string) => dash(value),
      },
    ];
  }, [chrome, itemNavTrail]);

  const backHref = navTrailBackHref(navTrailHops) || model?.milestone.record_detail_href || "/";
  const emptyText =
    (model?.linked_count ?? 0) === 0
      ? displayText(chrome?.empty_hint) || "No Expected Documents are linked to this Milestone."
      : displayText(chrome?.empty_items) || "No items found";

  const applySearch = (value: string) => {
    const next = value.trim();
    setQuery(next);
    setAppliedQuery(next);
    syncParams({
      department,
      completeness,
      requiredness,
      type: docType,
      subtype: docSubtype,
      q: next,
    });
  };

  const selectDepartment = (value: string | null | undefined) => {
    const next = filterParam(value);
    setDepartment(next);
    syncParams({
      department: next,
      completeness,
      requiredness,
      type: docType,
      subtype: docSubtype,
      q: appliedQuery,
    });
  };

  const selectCompleteness = (value: string | null | undefined) => {
    const next = filterParam(value);
    setCompleteness(next);
    syncParams({
      department,
      completeness: next,
      requiredness,
      type: docType,
      subtype: docSubtype,
      q: appliedQuery,
    });
  };

  const selectRequiredness = (value: string | null | undefined) => {
    const next = filterParam(value);
    setRequiredness(next);
    syncParams({
      department,
      completeness,
      requiredness: next,
      type: docType,
      subtype: docSubtype,
      q: appliedQuery,
    });
  };

  const selectDocTypeNode = (type?: string, subtype?: string) => {
    const nextType = filterParam(type);
    const nextSubtype = filterParam(subtype);
    setDocType(nextType);
    setDocSubtype(nextSubtype);
    if (nextType) {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        next.add(TREE_ROOT_KEY);
        next.add(typeTreeKey(nextType));
        return Array.from(next);
      });
    }
    syncParams({
      department,
      completeness,
      requiredness,
      type: nextType,
      subtype: nextSubtype,
      q: appliedQuery,
    });
  };

  const documentTypes = model?.filters.document_types;
  const departments = model?.filters.departments ?? [];
  const treeData = useMemo(
    () => buildDocumentTypeTreeData(dash(model?.milestone.scope_label), documentTypes ?? []),
    [model?.milestone.scope_label, documentTypes],
  );
  const selectedTreeKey = docSubtype && docType
    ? subtypeTreeKey(docType, docSubtype)
    : docType
      ? typeTreeKey(docType)
      : TREE_ROOT_KEY;

  return (
    <div className="milestone-workspace-page">
      <header className="milestone-workspace-page__header">
        <p className="milestone-workspace-page__back">
          <Link to={backHref}>← {displayText(chrome?.back) || "Back to previous page"}</Link>
        </p>
        <div className="milestone-workspace-page__title-row">
          <div className="milestone-workspace-page__title-block">
            <p className="milestone-workspace-page__object-label">
              {displayText(chrome?.object_label) || "Milestone"}
            </p>
            <h1>{model?.milestone.name || displayText(chrome?.title) || "Milestone Workspace"}</h1>
          </div>
          {model?.milestone.state_label ? (
            <span className="milestone-workspace-page__state">{model.milestone.state_label}</span>
          ) : null}
        </div>
      </header>

      <div className="milestone-workspace-page__body">
        <aside className="milestone-workspace-page__sidebar">
          <Tree
            className="milestone-workspace-page__tree"
            treeData={treeData}
            selectedKeys={[selectedTreeKey]}
            expandedKeys={expandedKeys}
            expandAction={false}
            blockNode
            onExpand={(keys) => setExpandedKeys(keys.map(String))}
            onSelect={(keys) => {
              const key = keys[0] ? String(keys[0]) : selectedTreeKey;
              const parsed = parseTreeKey(key);
              selectDocTypeNode(parsed.type, parsed.subtype);
            }}
          />
        </aside>

        <section className="milestone-workspace-page__content">
          <div className="milestone-workspace-page__section-head">
            <h2>{displayText(chrome?.expected_documents_title) || "Expected Documents"}</h2>
            {model && !loading ? (
              <span className="milestone-workspace-page__count">
                {displayTextTemplate(chrome?.items_count, { count: model.total_count }, "{count} items")}
              </span>
            ) : null}
          </div>

          <div className="milestone-workspace-page__filters">
            <label className="milestone-workspace-page__filter">
              <span className="milestone-workspace-page__filter-label">
                {displayText(chrome?.filter_department)}
              </span>
              <Select
                allowClear
                disabled={loading}
                placeholder={displayText(chrome?.all_departments)}
                value={department}
                options={departments.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                onChange={selectDepartment}
              />
            </label>
            <label className="milestone-workspace-page__filter">
              <span className="milestone-workspace-page__filter-label">
                {displayText(chrome?.filter_completeness)}
              </span>
              <Select
                allowClear
                disabled={loading}
                placeholder={displayText(chrome?.all_completeness)}
                value={completeness}
                options={(model?.filters.completeness ?? []).map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                onChange={selectCompleteness}
              />
            </label>
            <label className="milestone-workspace-page__filter">
              <span className="milestone-workspace-page__filter-label">
                {displayText(chrome?.filter_requiredness)}
              </span>
              <Select
                allowClear
                disabled={loading}
                placeholder={displayText(chrome?.all_requiredness)}
                value={requiredness}
                options={(model?.filters.requiredness ?? []).map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                onChange={selectRequiredness}
              />
            </label>
            <label className="milestone-workspace-page__filter milestone-workspace-page__filter--search">
              <span className="milestone-workspace-page__filter-label">
                {displayText(chrome?.search_name)}
              </span>
              <Input.Search
                allowClear
                loading={loading}
                placeholder={displayText(chrome?.search_name)}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSearch={applySearch}
              />
            </label>
          </div>

          {error ? <Alert type="error" title={error} showIcon role="alert" /> : null}
          <div ref={hostRef} className="milestone-workspace-page__table-host">
            <Table
              className="milestone-workspace-page__table"
              rowKey="record_id"
              size="small"
              loading={loading}
              columns={columns}
              dataSource={model?.items ?? []}
              pagination={false}
              locale={{ emptyText }}
              scroll={scrollY ? { x: "max-content", y: scrollY } : { x: "max-content" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
