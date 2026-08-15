import { Input } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { MetadataNameValuePair } from "../../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../admin/AdminCompactTable";
import { useUi } from "../../context/UiContext";
import { displayText, displayTextTemplate } from "../../lib/i18n";
import { formatMetadataValue } from "../../lib/metadataFormat";

function normalizeLifecycleRef(raw: string): string {
  return raw.trim().replace(/^Objectlifecycle\./i, "");
}

function normalizeObjectRef(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^Objecttype\./i.test(trimmed)) {
    const rest = trimmed.replace(/^Objecttype\./i, "");
    return rest.split(".")[0] ?? rest;
  }
  return trimmed.replace(/^Object\./i, "");
}

function normalizePicklistRef(raw: string): string {
  return raw.trim().replace(/^Picklist\./i, "");
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && !!item.trim());
  }
  return [];
}

function renderLinkedRefs(
  refs: string[],
  normalize: (raw: string) => string,
  href: (apiName: string) => string,
): ReactNode {
  if (refs.length === 0) return null;
  return (
    <span className="mono">
      {refs.map((ref, i) => {
        const apiName = normalize(ref);
        if (!apiName) {
          return (
            <span key={`${ref}-${i}`}>
              {i > 0 ? ", " : null}
              {ref}
            </span>
          );
        }
        return (
          <span key={`${apiName}-${i}`}>
            {i > 0 ? ", " : null}
            <Link className="metadata-link mono" to={href(apiName)}>
              {ref}
            </Link>
          </span>
        );
      })}
    </span>
  );
}

function objectHref(apiName: string): string {
  return `/admin/configuration/objects/${encodeURIComponent(apiName)}`;
}

function lifecycleHref(apiName: string): string {
  return `/admin/configuration/object-lifecycles/${encodeURIComponent(apiName)}`;
}

function picklistHref(apiName: string): string {
  return `/admin/configuration/picklists/${encodeURIComponent(apiName)}`;
}

function renderAttributeValue(name: string, value: unknown): ReactNode {
  const refs = stringValues(value);

  if (name === "available_lifecycles" || name === "lifecycle") {
    const linked = renderLinkedRefs(refs, normalizeLifecycleRef, lifecycleHref);
    if (linked) return linked;
  }

  if (name === "object" || name === "parent_object" || name === "referenced_object") {
    const linked = renderLinkedRefs(refs, normalizeObjectRef, objectHref);
    if (linked) return linked;
  }

  if (name === "picklist") {
    const linked = renderLinkedRefs(refs, normalizePicklistRef, picklistHref);
    if (linked) return linked;
  }

  // Bare Object./Objectlifecycle./Picklist. values in free-form attributes.
  if (refs.length === 1) {
    const raw = refs[0];
    if (/^Objectlifecycle\./i.test(raw)) {
      return renderLinkedRefs([raw], normalizeLifecycleRef, lifecycleHref);
    }
    if (/^Object(type)?\./i.test(raw)) {
      return renderLinkedRefs([raw], normalizeObjectRef, objectHref);
    }
    if (/^Picklist\./i.test(raw)) {
      return renderLinkedRefs([raw], normalizePicklistRef, picklistHref);
    }
  }

  return <span className="mono">{formatMetadataValue(value)}</span>;
}

// AttributeTable renders a searchable name/value table for a component's raw attributes.
// Shared by the object Details tab, field detail, and layout detail pages so all three
// present configuration attributes consistently and stay navigable when the attribute
// list is long.
const ATTR_SEARCH_MIN = 6;

export function AttributeTable({
  attributes,
  className,
  searchable,
}: {
  attributes: MetadataNameValuePair[];
  className?: string;
  /** When omitted, search shows only for longer attribute lists. */
  searchable?: boolean;
}) {
  const { shell } = useUi();
  const [query, setQuery] = useState("");
  const showSearch = searchable ?? attributes.length >= ATTR_SEARCH_MIN;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attributes;
    return attributes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        formatMetadataValue(a.value).toLowerCase().includes(q),
    );
  }, [attributes, query]);

  const columns: TableColumnsType<MetadataNameValuePair> = [
    {
      key: "name",
      dataIndex: "name",
      title: displayText(shell.metadata_attribute_name),
      className: "mono metadata-attr__name",
    },
    {
      key: "value",
      title: displayText(shell.metadata_value),
      className: "metadata-attr__value",
      render: (_v, row) => renderAttributeValue(row.name, row.value),
    },
  ];

  return (
    <div className={className}>
      {showSearch ? (
        <div className="filter-bar metadata-attr__bar">
          <Input.Search
            allowClear
            value={query}
            placeholder={displayText(shell.metadata_attributes_search_placeholder)}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <span className="data-table__empty metadata-count">
            {displayTextTemplate(shell.metadata_result_count, { count: filtered.length })}
          </span>
        </div>
      ) : null}
      <AdminCompactTable<MetadataNameValuePair>
        rowKey="name"
        columns={columns}
        dataSource={filtered}
        locale={{
          emptyText: adminTableEmptyText(displayText(shell.metadata_empty_attributes)),
        }}
      />
    </div>
  );
}
