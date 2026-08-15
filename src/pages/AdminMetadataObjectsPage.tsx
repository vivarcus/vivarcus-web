import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataObjectSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { filterAndRankByQuery } from "../lib/metadataSearchRank";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataObjectsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [objects, setObjects] = useState<MetadataObjectSummary[]>([]);
  const [query, setQuery] = useState("");
  const [inMenuFilter, setInMenuFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataObjects(vaultId);
      setObjects(data.objects);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const obj of objects) {
      if (obj.object_class) seen.add(obj.object_class);
    }
    return Array.from(seen)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [objects]);

  const filtered = useMemo(() => {
    const scoped = objects.filter((o) => {
      if (inMenuFilter === "yes" && !o.in_menu) return false;
      if (inMenuFilter === "no" && o.in_menu) return false;
      if (classFilter && (o.object_class ?? "") !== classFilter) return false;
      return true;
    });
    return filterAndRankByQuery(scoped, query, (o) => [
      o.label,
      o.label_plural,
      o.api_name,
      o.object_class,
    ]);
  }, [objects, query, inMenuFilter, classFilter]);

  const openObject = useCallback(
    (apiName: string) =>
      navigate(`/admin/configuration/objects/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataObjectSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_object_label),
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, obj) => (
        <Button type="link" className="metadata-link" onClick={() => openObject(obj.api_name)}>
          {displayText(obj.label || undefined, obj.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_object_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => openObject(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "object_class",
      dataIndex: "object_class",
      title: displayText(shell.metadata_object_class),
      className: "mono",
      render: (v?: string) => v || "—",
    },
    {
      key: "in_menu",
      dataIndex: "in_menu",
      title: displayText(shell.metadata_in_menu),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no),
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell title={displayText(shell.metadata_objects_title)}>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_objects_search_placeholder)}
          onChange={(e) => setQuery(e.target.value)}
          className="filter-bar__max-280"
        />
        <Select
          value={classFilter}
          onChange={(v) => setClassFilter(v ?? "")}
          options={[
            { value: "", label: displayText(shell.metadata_filter_all_classes) },
            ...classOptions,
          ]}
          className="filter-bar__min-140"
        />
        <Select
          value={inMenuFilter}
          onChange={(v) => setInMenuFilter(v ?? "")}
          options={[
            { value: "", label: displayText(shell.metadata_filter_all) },
            { value: "yes", label: displayText(shell.metadata_yes) },
            { value: "no", label: displayText(shell.metadata_no) },
          ]}
          className="filter-bar__min-120"
        />
        <span className="data-table__empty metadata-count">
          {displayTextTemplate(shell.metadata_result_count, { count: filtered.length })}
        </span>
      </div>

      {loading && objects.length === 0 ? (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      ) : (
        <AdminCompactTable<MetadataObjectSummary>
            wrapClassName="table-wrap--metadata"
            rowKey="api_name"
            pagination={false}
            columns={columns}
            dataSource={filtered}
            locale={{
              emptyText: adminTableEmptyText(displayText(shell.metadata_empty_objects)),
            }}
          />
      )}
    </AdminPageShell>
  );
}
