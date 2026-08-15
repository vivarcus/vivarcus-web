import { Input, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState } from "react";
import type {
  MetadataFieldSummary,
  MetadataObjectTypeFieldMembership,
  MetadataObjectTypeSummary,
} from "../../api/types";
import { AdminCompactTable } from "../admin/AdminCompactTable";
import { useUi } from "../../context/UiContext";
import { displayText, displayTextTemplate } from "../../lib/i18n";

type MatrixRow = {
  key: string;
  api_name: string;
  label: string;
  cells: Record<string, { included: boolean; required?: boolean }>;
};

// ObjectTypesMatrix mirrors Veeva's Object Types → Edit Object Type Fields grid in read-only form:
// fields as rows, types as columns, ✔ / ✔* (required override) / blank.
export function ObjectTypesMatrix({
  types,
  fields,
}: {
  types: MetadataObjectTypeSummary[];
  fields: MetadataFieldSummary[];
}) {
  const { shell } = useUi();
  const [query, setQuery] = useState("");

  const membership = useMemo(() => {
    const byType = new Map<string, Map<string, MetadataObjectTypeFieldMembership>>();
    for (const t of types) {
      const map = new Map<string, MetadataObjectTypeFieldMembership>();
      for (const f of t.fields ?? []) map.set(f.api_name, f);
      byType.set(t.api_name, map);
    }
    return byType;
  }, [types]);

  const rows = useMemo(() => {
    const fieldLabels = new Map(fields.map((f) => [f.api_name, f.label || f.api_name]));
    // Prefer object field catalog order; append any type-only names at the end.
    const seen = new Set<string>();
    const names: string[] = [];
    for (const f of fields) {
      if (!seen.has(f.api_name)) {
        seen.add(f.api_name);
        names.push(f.api_name);
      }
    }
    for (const t of types) {
      for (const f of t.fields ?? []) {
        if (!seen.has(f.api_name)) {
          seen.add(f.api_name);
          names.push(f.api_name);
        }
      }
    }
    return names.map((name): MatrixRow => {
      const cells: MatrixRow["cells"] = {};
      for (const t of types) {
        const declared = membership.get(t.api_name);
        const hasDeclared = (t.fields?.length ?? 0) > 0;
        if (!hasDeclared) {
          // Empty type_fields[] = inherits every object field.
          cells[t.api_name] = { included: true };
        } else {
          const mem = declared?.get(name);
          cells[t.api_name] = mem
            ? { included: true, required: mem.required }
            : { included: false };
        }
      }
      return {
        key: name,
        api_name: name,
        label: fieldLabels.get(name) ?? name,
        cells,
      };
    });
  }, [fields, types, membership]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.api_name.toLowerCase().includes(q) || r.label.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const columns: TableColumnsType<MatrixRow> = [
    {
      key: "field",
      title: displayText(shell.metadata_field_name),
      fixed: "start",
      width: 220,
      render: (_v, row) => (
        <div>
          <div className="mono">{row.api_name}</div>
          {row.label && row.label !== row.api_name && (
            <div className="data-table__empty">{row.label}</div>
          )}
        </div>
      ),
    },
    ...types.map((t) => ({
      key: t.api_name,
      title: (
        <div>
          <div>{t.label || t.api_name}</div>
          <div className="mono data-table__empty">{t.api_name}</div>
          {t.default_type && (
            <Tag color="processing">{displayText(shell.metadata_default_type)}</Tag>
          )}
        </div>
      ),
      align: "center" as const,
      width: 140,
      render: (_v: unknown, row: MatrixRow) => {
        const cell = row.cells[t.api_name];
        if (!cell?.included) return null;
        return (
          <span className="perm-crud-cell" title={cell.required ? "required override" : undefined}>
            <span className="perm-crud perm-crud--on" aria-label={t.api_name}>
              ✓
            </span>
            {cell.required ? <span className="perm-crud-cell__star">*</span> : null}
          </span>
        );
      },
    })),
  ];

  if (types.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_object_types)}</span>
    );
  }

  const scrollX = Math.max(600, 220 + types.length * 140);

  return (
    <div>
      <p className="data-table__empty metadata-count">
        {displayText(shell.metadata_typefield_required_legend)}
      </p>
      <div className="filter-bar metadata-attr__bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_fields_search_placeholder)}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="data-table__empty metadata-count">
          {displayTextTemplate(shell.metadata_result_count, { count: filtered.length })}
        </span>
      </div>
      <AdminCompactTable<MatrixRow>
        rowKey="key"
        scrollX={scrollX}
        scroll={{ x: scrollX }}
        columns={columns}
        dataSource={filtered}
      />
    </div>
  );
}
