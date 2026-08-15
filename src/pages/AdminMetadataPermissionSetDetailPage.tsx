import { Alert, Input, Spin, Tabs, Tag } from "antd";
import type { TableColumnsType, TabsProps } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataPermissionSetCategory,
  MetadataPermissionSetDetailModel,
  MetadataPermissionSetEntry,
  MetadataPermissionSetObjectSummary,
  MetadataPermissionSetReferrer,
  MetadataPermissionSetTabSummary,
  MetadataPermissionSetUsage,
} from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import {
  countCategoryMatches,
  countTabSummaryMatches,
  filterCapabilitySections,
  filterFlatEntries,
  filterObjectSummaries,
  filterTabSummaries,
  flattenObjectSummaries,
  flattenTabSummaries,
  groupCapabilityEntries,
  humanizeApiName,
  OBJECT_CRUD_ACTIONS,
  TAB_VIEW_ACTION,
  type CapabilitySectionId,
  type ObjectsTableRow,
  type TabsTableRow,
} from "./permissionSetView";
import { ObjectCrudCheckbox, renderActions } from "./permissionActions";
import {
  capabilityKeyLabel,
  capabilitySectionEntryLabel,
  capabilitySectionLabel,
} from "./permissionCapabilityLabels";

type Shell = ShellChrome;

// CATEGORY_ORDER is the fixed display order of the permission set tabs, mirroring Veeva. The
// Objects tab is synthesized from the full object universe (model.objects) rather than the
// configured "objects" category, so it is positioned here explicitly.
const CATEGORY_ORDER = ["admin", "application", "objects", "tabs", "pages", "mobile"];

function categoryOrderIndex(key: string): number {
  const i = CATEGORY_ORDER.indexOf(key);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

export function AdminMetadataPermissionSetDetailPage() {
  const { permissionSetName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataPermissionSetDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // query is lifted to the page so it filters every category at once (Veeva scopes search per
  // tab; a permission set spans hundreds of entries so a single cross-tab search is faster).
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!vaultId || !permissionSetName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataPermissionSetDetail(vaultId, permissionSetName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, permissionSetName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const hasContent =
    !!model &&
    (model.categories.length > 0 || model.objects.length > 0 || (model.tabs ?? []).length > 0);

  const title = model
    ? displayText(model.label || undefined, model.api_name)
    : permissionSetName;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups/permission_sets">
            {displayText(shell.metadata_permission_sets_title)}
          </Link>
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && (
        <>
          <PermissionSetSummary model={model} shell={shell} />
          <PermissionSetUsageSection usage={model.used_by} shell={shell} />
          {!hasContent ? (
            <span className="data-table__empty page-section">
              {displayText(shell.metadata_empty_objects)}
            </span>
          ) : (
            <>
              <div className="filter-bar page-section">
                <Input.Search
                  allowClear
                  value={query}
                  placeholder={displayText(shell.metadata_permission_search_placeholder)}
                  onChange={(e) => setQuery(e.target.value)}
                  className="filter-bar__max-360"
                />
              </div>
              <Tabs
                className="page-section"
                defaultActiveKey={model.objects.length > 0 ? "objects" : undefined}
                items={permissionCategoryTabs(model, query, shell)}
              />
            </>
          )}
        </>
      )}
    </AdminPageShell>
  );
}

// PermissionSetSummary mirrors Veeva Details: Status / Name / Description / Source as a field list
// (not a bordered attribute dump). Used By and category tabs follow below.
function PermissionSetSummary({ model, shell }: { model: MetadataPermissionSetDetailModel; shell: Shell }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: displayText(shell.metadata_status),
      value: model.active
        ? displayText(shell.metadata_status_active)
        : displayText(shell.metadata_status_inactive),
    },
    {
      label: displayText(shell.metadata_lifecycle_name),
      value: displayText(model.label || undefined, model.api_name),
    },
    {
      label: displayText(shell.metadata_permission_description),
      value: model.description || "—",
    },
    {
      label: displayText(shell.metadata_source),
      value: sourceLabel(model.source),
    },
  ];

  return (
    <section className="page-section permission-set-detail__details">
      <h2 className="security-profile-detail__section-title">
        {displayText(shell.metadata_details_tab)}
      </h2>
      <dl className="security-profile-detail__fields">
        {rows.map((row) => (
          <div key={row.label} className="security-profile-detail__field">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// PermissionSetUsageSection renders where the permission set is referenced (its "impact"): the
// Security Profiles that include it and the Application Roles that bind it via a Role Permission
// Set. This lets an administrator gauge the blast radius before editing / deactivating a set.
// When nothing references the set, a muted note is shown so an orphaned set is obvious.
function PermissionSetUsageSection({
  usage,
  shell,
}: {
  usage: MetadataPermissionSetUsage;
  shell: Shell;
}) {
  const profiles = usage?.security_profiles ?? [];
  const roles = usage?.application_roles ?? [];
  const empty = profiles.length === 0 && roles.length === 0;
  return (
    <section className="page-section perm-usage">
      <h2 className="perm-usage__title">{displayText(shell.metadata_permission_used_by)}</h2>
      {empty ? (
        <span className="data-table__empty">
          {displayText(shell.metadata_permission_used_by_none)}
        </span>
      ) : (
        <div className="perm-usage__groups">
          <PermissionSetReferrerList
            title={displayText(shell.metadata_permission_used_by_profiles)}
            referrers={profiles}
            shell={shell}
            linkTo={(apiName) =>
              `/admin/users-groups/security_profiles/${encodeURIComponent(apiName)}`
            }
          />
          <PermissionSetReferrerList
            title={displayText(shell.metadata_permission_used_by_roles)}
            referrers={roles}
            shell={shell}
          />
        </div>
      )}
    </section>
  );
}

// PermissionSetReferrerList renders one labelled row of referrers as tags (human label only,
// matching Veeva). An inactive referrer is dimmed and marked so a stale binding does not read as
// live impact. An empty group renders a dash.
function PermissionSetReferrerList({
  title,
  referrers,
  shell,
  linkTo,
}: {
  title: string;
  referrers: MetadataPermissionSetReferrer[];
  shell: Shell;
  linkTo?: (apiName: string) => string;
}) {
  return (
    <div className="perm-usage__group">
      <span className="perm-usage__label">
        {title} ({referrers.length})
      </span>
      <span className="perm-usage__tags">
        {referrers.length === 0
          ? "—"
          : referrers.map((r) => {
              const to = linkTo?.(r.api_name);
              const body = (
                <>
                  {displayText(r.label || undefined, r.api_name)}
                  {!r.active && (
                    <span className="perm-usage__tag-inactive">
                      · {displayText(shell.metadata_permission_inactive_suffix)}
                    </span>
                  )}
                </>
              );
              return (
                <Tag
                  key={`${r.api_name}:${r.label}`}
                  className={r.active ? "" : "perm-usage__tag--inactive"}
                >
                  {to ? <Link to={to}>{body}</Link> : body}
                </Tag>
              );
            })}
      </span>
    </div>
  );
}

// permissionCategoryTabs builds the permission set tabs. The Objects tab is synthesized from the
// full object universe (model.objects) so an administrator sees every object — including ones the
// set does not touch — as a scannable table; clicking an object opens its dedicated permission
// page (field / object-type / control matrix). Admin and Application come from the backend as
// fixed capability catalogs (granted + withheld checkboxes). Tabs render as a Veeva-style
// collection/subtab hierarchy with a View column; Pages / Mobile still use the flat grant table.
// Each tab label carries a match count while searching so hits are visible without opening every tab.
function permissionCategoryTabs(
  model: MetadataPermissionSetDetailModel,
  query: string,
  shell: Shell,
) {
  const searching = query.trim().length > 0;
  const tabs: { order: number; item: NonNullable<TabsProps["items"]>[number] }[] = [];
  const entryLabels = model.entry_labels ?? {};

  if (model.objects.length > 0) {
    const matchedObjects = filterObjectSummaries(model.objects, query).length;
    tabs.push({
      order: categoryOrderIndex("objects"),
      item: {
        key: "objects",
        label: objectsTabLabel(
          displayText(shell.metadata_permission_category_objects),
          model.objects.length,
          matchedObjects,
          searching,
        ),
        children: (
          <ObjectsTableView
            objects={model.objects}
            query={query}
            permissionSetName={model.api_name}
            shell={shell}
          />
        ),
      },
    });
  }

  if ((model.tabs ?? []).length > 0) {
    const matched = countTabSummaryMatches(model.tabs, query);
    tabs.push({
      order: categoryOrderIndex("tabs"),
      item: {
        key: "tabs",
        label: categoryTabLabel(
          displayText(shell.metadata_permission_category_tabs),
          matched,
          countTabSummaryMatches(model.tabs, ""),
          searching,
        ),
        children: <TabsTableView tabs={model.tabs} query={query} shell={shell} />,
      },
    });
  }

  for (const cat of model.categories) {
    // Objects / Tabs are superseded by the full-universe lists above.
    if (cat.key === "objects" || cat.key === "tabs") continue;
    const label = categoryLabel(cat, shell);
    const matched = countCategoryMatches(cat, query);
    const isCapability = cat.key === "admin" || cat.key === "application";
    tabs.push({
      order: categoryOrderIndex(cat.key),
      item: {
        key: cat.key,
        label: categoryTabLabel(label, matched, cat.entries.length, searching),
        children: isCapability ? (
          <GroupedCapabilityView
            categoryKey={cat.key}
            entries={cat.entries}
            query={query}
            shell={shell}
          />
        ) : (
          <FlatCategoryView
            category={cat}
            query={query}
            entryLabels={entryLabels}
            shell={shell}
          />
        ),
      },
    });
  }

  tabs.sort((a, b) => a.order - b.order);
  return tabs.map((t) => t.item);
}

// categoryLabel resolves a category's localized display label from its stable key, falling back
// to the backend-provided label for any key not in the fixed catalog (so a future category is
// never rendered blank).
function categoryLabel(cat: MetadataPermissionSetCategory, shell: Shell): string {
  switch (cat.key) {
    case "admin":
      return displayText(shell.metadata_permission_category_admin);
    case "application":
      return displayText(shell.metadata_permission_category_application);
    case "objects":
      return displayText(shell.metadata_permission_category_objects);
    case "tabs":
      return displayText(shell.metadata_permission_category_tabs);
    case "pages":
      return displayText(shell.metadata_permission_category_pages);
    case "mobile":
      return displayText(shell.metadata_permission_category_mobile);
    default:
      return cat.label;
  }
}

function categoryTabLabel(label: string, matched: number, total: number, searching: boolean): string {
  return searching ? `${label} (${matched} / ${total})` : `${label} (${total})`;
}

// objectsTabLabel renders the Objects tab label with an object count summary. While searching it
// shows matched / total objects; otherwise the total object count.
function objectsTabLabel(label: string, total: number, matched: number, searching: boolean): string {
  return searching ? `${label} (${matched} / ${total})` : `${label} (${total})`;
}

// FlatCategoryView renders a non-Objects category as a single filtered table.
function FlatCategoryView({
  category,
  query,
  entryLabels,
  shell,
}: {
  category: MetadataPermissionSetCategory;
  query: string;
  entryLabels: Record<string, string>;
  shell: Shell;
}) {
  const entries = useMemo(() => filterFlatEntries(category.entries, query), [category.entries, query]);
  return (
    <AdminCompactTable<MetadataPermissionSetEntry>
        rowKey="key"
        pagination={false}

        locale={{
          emptyText: adminTableEmptyText(displayText(shell.metadata_permission_no_matches)),
        }}
        columns={flatEntryColumns(entryLabels, shell)}
        dataSource={entries}
          />
  );
}

// GroupedCapabilityView renders Admin / Application as Veeva-style titled sections (Security,
// Configuration, Vault Actions, …). Each section is its own compact table; row labels drop the
// section family prefix so they read like Veeva ("Users", not "Security · Users").
function GroupedCapabilityView({
  categoryKey,
  entries,
  query,
  shell,
}: {
  categoryKey: string;
  entries: MetadataPermissionSetEntry[];
  query: string;
  shell: Shell;
}) {
  const sections = useMemo(() => {
    const grouped = groupCapabilityEntries(categoryKey, entries);
    return filterCapabilitySections(grouped, query);
  }, [categoryKey, entries, query]);

  if (sections.length === 0) {
    return (
      <span className="data-table__empty">
        {displayText(shell.metadata_permission_no_matches)}
      </span>
    );
  }

  return (
    <div className="perm-capability-sections">
      {sections.map((section) => (
        <section key={section.id} className="perm-object-section">
          <div className="perm-object-section__head">
            <h3 className="perm-object-section__title">
              {capabilitySectionLabel(section.id, shell)}
            </h3>
          </div>
          <AdminCompactTable<MetadataPermissionSetEntry>
              rowKey="key"
              pagination={false}

              columns={capabilityEntryColumns(section.id, shell)}
              dataSource={section.entries}
          />
        </section>
      ))}
    </div>
  );
}

// capabilityEntryColumns builds Admin / Application columns with section-aware row labels.
function capabilityEntryColumns(
  sectionId: CapabilitySectionId,
  shell: Shell,
): TableColumnsType<MetadataPermissionSetEntry> {
  return [
    {
      key: "key",
      title: displayText(shell.metadata_permission_entry),
      render: (_v, entry: MetadataPermissionSetEntry) => (
        <span className="perm-entry-target__label">
          {capabilitySectionEntryLabel(entry.key, sectionId, shell)}
        </span>
      ),
    },
    {
      key: "actions",
      dataIndex: "actions",
      title: displayText(shell.metadata_permission_actions),
      render: (_actions: string[], entry: MetadataPermissionSetEntry) => renderActions(entry),
    },
  ];
}

// TabsTableView renders the full Tab universe as a Veeva-style hierarchy: top-level tabs /
// collections as parent rows, subtabs indented underneath, with a single View checkbox column.
function TabsTableView({
  tabs,
  query,
  shell,
}: {
  tabs: MetadataPermissionSetTabSummary[];
  query: string;
  shell: Shell;
}) {
  const filtered = useMemo(() => filterTabSummaries(tabs, query), [tabs, query]);
  const rows = useMemo(() => flattenTabSummaries(filtered), [filtered]);
  return (
    <AdminCompactTable<TabsTableRow>
        rowKey="key"
        pagination={false}

        locale={{
          emptyText: adminTableEmptyText(displayText(shell.metadata_permission_no_matches)),
        }}
        onRow={(row) =>
          row.kind === "subtab" ? { className: "perm-obj-type-row" } : {}
        }
        columns={tabsSummaryColumns(shell)}
        dataSource={rows}
          />
  );
}

// tabsSummaryColumns builds the Veeva Tabs matrix: Tab (parent or indented subtab) + View.
function tabsSummaryColumns(shell: Shell): TableColumnsType<TabsTableRow> {
  return [
    {
      key: "tab",
      title: displayText(shell.metadata_permission_kind_tab),
      render: (_v, row) => {
        if (row.kind === "subtab") {
          return (
            <span className="perm-entry-target__label perm-entry-target--type">
              {row.subtab.label || humanizeApiName(row.subtab.api_name)}
            </span>
          );
        }
        return (
          <span className="perm-entry-target__label">
            {row.tab.label || humanizeApiName(row.tab.api_name)}
          </span>
        );
      },
    },
    {
      key: TAB_VIEW_ACTION,
      title: "View",
      width: 88,
      align: "center" as const,
      render: (_v, row) => (
        <ObjectCrudCheckbox
          action={TAB_VIEW_ACTION}
          actions={row.kind === "tab" ? row.tab.actions : row.subtab.actions}
        />
      ),
    },
  ];
}

// ObjectsTableView renders the full object universe as a scannable, searchable table with object
// types nested under each object (Veeva Objects tab hierarchy). Object-level and type-level rows
// both show the set's effective record-access CRUD summary; clicking an object (or its type) opens
// the object's dedicated permission page.
function ObjectsTableView({
  objects,
  query,
  permissionSetName,
  shell,
}: {
  objects: MetadataPermissionSetObjectSummary[];
  query: string;
  permissionSetName: string;
  shell: Shell;
}) {
  const navigate = useNavigate();
  const filtered = useMemo(() => filterObjectSummaries(objects, query), [objects, query]);
  const rows = useMemo(() => flattenObjectSummaries(filtered), [filtered]);
  const objectHref = useCallback(
    (objectName: string) =>
      `/admin/users-groups/permission_sets/${encodeURIComponent(permissionSetName)}/objects/${encodeURIComponent(objectName)}`,
    [permissionSetName],
  );

  return (
    <div>
      <div className="filter-bar filter-bar--tight">
        <span className="data-table__empty filter-bar__meta-end">
          {displayTextTemplate(shell.metadata_permission_objects_total, { objects: filtered.length })}
        </span>
      </div>
      <AdminCompactTable<ObjectsTableRow>
          rowKey="key"
          pagination={false}

          locale={{
            emptyText: adminTableEmptyText(displayText(shell.metadata_permission_no_matches)),
          }}
          onRow={(row) => {
            const apiName = row.kind === "object" ? row.object.api_name : row.objectApiName;
            return {
              className:
                row.kind === "object"
                  ? "data-table__row--link"
                  : "data-table__row--link perm-obj-type-row",
              onClick: (e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                navigate(objectHref(apiName));
              },
            };
          }}
          columns={objectSummaryColumns(objectHref, shell)}
          dataSource={rows}
          />
    </div>
  );
}

// objectSummaryColumns builds the Veeva Objects-tab matrix: Object (parent link or indented
// type label) plus Read / Create / Edit / Delete checkbox columns. Source is omitted — Veeva's
// Objects permission grid does not show component source.
function objectSummaryColumns(
  objectHref: (objectName: string) => string,
  shell: Shell,
): TableColumnsType<ObjectsTableRow> {
  const crudColumns: TableColumnsType<ObjectsTableRow> = OBJECT_CRUD_ACTIONS.map((action) => ({
    key: action,
    title: action.charAt(0).toUpperCase() + action.slice(1),
    width: 88,
    align: "center" as const,
    render: (_v, row) => (
      <ObjectCrudCheckbox
        action={action}
        actions={row.kind === "object" ? row.object.actions : row.type.actions}
      />
    ),
  }));

  return [
    {
      key: "object",
      title: displayText(shell.metadata_permission_kind_object),
      // No column sorter: rows are pre-ordered by object api_name with types nested underneath;
      // sorting the flattened list would break the parent/child adjacency.
      render: (_v, row) => {
        if (row.kind === "object_type") {
          // Veeva renders object types as plain indented labels (not links).
          const label = row.type.label || humanizeApiName(row.type.api_name);
          return <span className="perm-entry-target__label perm-entry-target--type">{label}</span>;
        }
        const obj = row.object;
        return (
          <Link className="perm-entry-target__label" to={objectHref(obj.api_name)}>
            {obj.label || humanizeApiName(obj.api_name)}
          </Link>
        );
      },
    },
    ...crudColumns,
  ];
}

// flatEntryColumns builds the column set for a flat (non-Objects) category table. The Permission
// column shows a human label only (resolved component label for Tabs / Pages / Mobile, or a
// localized capability key for Admin / Application / Security) — no raw api/key beside it.
function flatEntryColumns(
  entryLabels: Record<string, string>,
  shell: Shell,
): TableColumnsType<MetadataPermissionSetEntry> {
  return [
    {
      key: "key",
      title: displayText(shell.metadata_permission_entry),
      render: (_v, entry: MetadataPermissionSetEntry) => {
        const label = entryLabels[entry.key] ?? capabilityKeyLabel(entry.key, shell);
        return <span className="perm-entry-target__label">{label}</span>;
      },
    },
    {
      key: "actions",
      dataIndex: "actions",
      title: displayText(shell.metadata_permission_actions),
      render: (_actions: string[], entry: MetadataPermissionSetEntry) => renderActions(entry),
    },
  ];
}
