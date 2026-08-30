import { Alert, Input, Select, Spin, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataSecurityProfileDetailModel,
  MetadataSecurityProfilePermissionSetRef,
  MetadataSecurityProfileUser,
} from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { SecurityProfileLicenseCapPreview } from "../components/admin/SecurityProfileLicenseCapPreview";

type Shell = ShellChrome;

/** Veeva-style Security Profile detail: Details + Permission Sets + Users + right anchors. */
export function AdminMetadataSecurityProfileDetailPage() {
  const { securityProfileName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataSecurityProfileDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !securityProfileName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataSecurityProfileDetail(vaultId, securityProfileName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, securityProfileName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const title = model
    ? displayText(model.label || undefined, model.api_name)
    : securityProfileName;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups/security_profiles">
            {displayText(shell.metadata_security_profiles_title)}
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

      {model && <SecurityProfileDetailBody model={model} shell={shell} vaultId={vaultId} />}
    </AdminPageShell>
  );
}

function SecurityProfileDetailBody({
  model,
  shell,
  vaultId,
}: {
  model: MetadataSecurityProfileDetailModel;
  shell: Shell;
  vaultId: string;
}) {
  const idBase = `sp-${model.api_name}`;
  const sections = [
    { id: `${idBase}-details`, title: displayText(shell.metadata_details_tab) },
    { id: `${idBase}-permission-sets`, title: displayText(shell.metadata_permission_sets_title) },
    { id: `${idBase}-license-cap`, title: "License Cap Preview" },
    { id: `${idBase}-users`, title: displayText(shell.metadata_security_profile_users_title) },
  ];

  return (
    <div className="security-profile-detail">
      <div className="security-profile-detail__sections">
        <section id={sections[0].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[0].title}</h2>
          <DetailsFields model={model} shell={shell} />
        </section>

        <section id={sections[1].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[1].title}</h2>
          <PermissionSetsTable members={model.permission_sets} shell={shell} />
        </section>

        <section id={sections[2].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[2].title}</h2>
          <SecurityProfileLicenseCapPreview
            vaultId={vaultId}
            securityProfileApiName={model.api_name}
            shell={shell}
          />
        </section>

        <section id={sections[3].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[3].title}</h2>
          <UsersTable users={model.users ?? []} shell={shell} />
        </section>
      </div>

      <nav
        className="security-profile-detail__nav"
        aria-label={displayText(shell.metadata_details_tab)}
      >
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
    </div>
  );
}

function DetailsFields({
  model,
  shell,
}: {
  model: MetadataSecurityProfileDetailModel;
  shell: Shell;
}) {
  // Field order mirrors Veeva Security Profile Details: Status, Name, Description, Source.
  const rows: { label: string; value: ReactNode }[] = [
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
      value: sourceLabel(model.source, shell),
    },
  ];

  return (
    <dl className="security-profile-detail__fields">
      {rows.map((row) => (
        <div key={row.label} className="security-profile-detail__field">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// PermissionSetsTable lists the permission sets a profile aggregates. Existing members link to
// their permission set detail; dangling refs are tagged missing (Veeva columns: Name / Description).
function PermissionSetsTable({
  members,
  shell,
}: {
  members: MetadataSecurityProfilePermissionSetRef[];
  shell: Shell;
}) {
  const columns: TableColumnsType<MetadataSecurityProfilePermissionSetRef> = [
    {
      key: "name",
      title: displayText(shell.metadata_lifecycle_name),
      defaultSortOrder: "ascend",
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, m) =>
        m.exists ? (
          <Link
            className="metadata-link"
            to={`/admin/users-groups/permission_sets/${encodeURIComponent(m.api_name)}`}
          >
            {displayText(m.label || undefined, m.api_name)}
          </Link>
        ) : (
          <span>
            <span className="mono">{m.api_name}</span>{" "}
            <Tag color="warning">{displayText(shell.metadata_security_profile_member_missing)}</Tag>
          </span>
        ),
    },
    {
      key: "description",
      dataIndex: "description",
      title: displayText(shell.metadata_permission_description),
      render: (d: string | undefined, m) => (!m.exists ? "—" : d?.trim() ? d : "—"),
    },
  ];

  return (
    <AdminCompactTable<MetadataSecurityProfilePermissionSetRef>
        rowKey="api_name"
        pagination={false}
        locale={{
          emptyText: adminTableEmptyText(displayText(shell.metadata_empty_permission_sets)),
        }}
        columns={columns}
        dataSource={members}
          />
  );
}

// UsersTable mirrors Veeva's Users tab: Name / User Name / Status, with search + Active filter.
function UsersTable({ users, shell }: { users: MetadataSecurityProfileUser[]; shell: Shell }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "">("active");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && !u.active) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.status.toLowerCase().includes(q)
      );
    });
  }, [users, query, statusFilter]);

  const columns: TableColumnsType<MetadataSecurityProfileUser> = [
    {
      key: "name",
      title: displayText(shell.metadata_lifecycle_name),
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_v, u) => u.name || u.username,
    },
    {
      key: "username",
      dataIndex: "username",
      title: displayText(shell.metadata_security_profile_user_name),
      sorter: (a, b) => a.username.localeCompare(b.username),
      render: (v: string) => <span className="mono">{v}</span>,
    },
    {
      key: "status",
      dataIndex: "status",
      title: displayText(shell.metadata_status),
      sorter: (a, b) => Number(a.active) - Number(b.active),
      render: (_v, u) =>
        u.active
          ? displayText(shell.metadata_status_active)
          : displayText(shell.metadata_status_inactive),
    },
  ];

  return (
    <>
      <div className="filter-bar filter-bar--tight">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_security_profile_users_search_placeholder)}
          onChange={(e) => setQuery(e.target.value)}
          className="filter-bar__max-320"
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          className="filter-bar__min-150"
          options={[
            { value: "active", label: displayText(shell.metadata_status_active) },
            { value: "", label: displayText(shell.metadata_filter_all_statuses) },
          ]}
        />
      </div>
      <AdminCompactTable<MetadataSecurityProfileUser>
          rowKey="user_id"
          pagination={false}
          locale={{
            emptyText: adminTableEmptyText(displayText(shell.metadata_security_profile_empty_users)),
          }}
          columns={columns}
          dataSource={filtered}
          />
    </>
  );
}
