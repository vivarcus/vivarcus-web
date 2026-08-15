import { Alert, Button, Dropdown, Modal, Spin } from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api, HttpError } from "../api/client";
import type { DomainUserDetailModel, DomainUserVaultMembership } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

function actionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    return err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

function displayName(model: DomainUserDetailModel): string {
  const parts = [model.first_name, model.last_name].map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/** Veeva-style Domain User detail: identity + Domain Status + Vault Memberships (read-only). */
export function AdminDomainUserDetailPage() {
  const vaultId = useVaultId();
  const { userId = "" } = useParams<{ userId: string }>();
  const { shell } = useUi();
  const [model, setModel] = useState<DomainUserDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId || !userId) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.domainUserDetail(vaultId, userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, userId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeDomainStatus = useCallback(() => {
    if (!vaultId || !model || !model.can_change_domain_status || statusPending) return;
    const nextActive = !model.domain_active;
    Modal.confirm({
      title: nextActive
        ? "Change Domain Status to Active"
        : "Change Domain Status to Inactive",
      content: nextActive
        ? "Re-enable this Domain User's domain identity? Vault memberships stay inactive until activated per Vault."
        : "Disable this Domain User across the whole home domain? Active login sessions will be revoked.",
      okButtonProps: nextActive ? undefined : { danger: true },
      onOk: async () => {
        setStatusError(null);
        setStatusPending(true);
        try {
          if (nextActive) {
            await api.enableDomainUser(vaultId, model.user_id);
          } else {
            await api.disableDomainUser(vaultId, model.user_id);
          }
          await load();
        } catch (err) {
          setStatusError(actionErrorMessage(err, displayText(shell.action_failed)));
        } finally {
          setStatusPending(false);
        }
      },
    });
  }, [vaultId, model, statusPending, load, shell.action_failed]);

  const actionMenu: MenuProps = useMemo(() => {
    if (!model?.can_change_domain_status) {
      return { items: [] };
    }
    const label = model.domain_active
      ? "Change Domain Status to Inactive"
      : "Change Domain Status to Active";
    return {
      items: [
        {
          key: "change-domain-status",
          label,
          danger: model.domain_active,
          disabled: statusPending,
          onClick: () => changeDomainStatus(),
        },
      ],
    };
  }, [model, statusPending, changeDomainStatus]);

  if (!vaultId) return null;

  const title = model?.username || userId;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups/domain_users">Domain Users</Link>
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
      actions={
        model?.can_change_domain_status ? (
          <div className="page-header__actions">
            <Dropdown menu={actionMenu} trigger={["click"]}>
              <Button loading={statusPending}>Actions</Button>
            </Dropdown>
          </div>
        ) : undefined
      }
    >

      {statusError && (
        <Alert type="error" title={statusError} showIcon role="alert" className="admin-page__banner" />
      )}
      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && <DomainUserDetailBody model={model} />}
    </AdminPageShell>
  );
}

function DomainUserDetailBody({ model }: { model: DomainUserDetailModel }) {
  const idBase = `domain-user-${model.user_id}`;
  const sections = [
    { id: `${idBase}-details`, title: "Details" },
    { id: `${idBase}-memberships`, title: "Vault Memberships" },
  ];

  return (
    <div className="security-profile-detail">
      <div className="security-profile-detail__sections">
        <section id={sections[0].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[0].title}</h2>
          <DetailsFields model={model} />
        </section>

        <section id={sections[1].id} className="security-profile-detail__section">
          <h2 className="security-profile-detail__section-title">{sections[1].title}</h2>
          <VaultMembershipsTable rows={model.vault_memberships ?? []} />
        </section>
      </div>

      <nav className="security-profile-detail__nav" aria-label="Details">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
    </div>
  );
}

function DetailsFields({ model }: { model: DomainUserDetailModel }) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Username", value: model.username || "—" },
    { label: "Name", value: displayName(model) },
    { label: "Email", value: model.email || "—" },
    { label: "Company", value: model.company_name || "—" },
    { label: "Home Domain", value: model.home_domain_id || "—" },
    { label: "Domain Status", value: model.domain_status || "—" },
    { label: "Domain Admin", value: yesNo(model.domain_admin) },
    { label: "Cross-Domain", value: yesNo(model.cross_domain) },
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

function VaultMembershipsTable({ rows }: { rows: DomainUserVaultMembership[] }) {
  const columns: TableColumnsType<DomainUserVaultMembership> = [
    {
      key: "vault_name",
      title: "Vault",
      dataIndex: "vault_name",
      render: (v: string) => v || "—",
    },
    {
      key: "license_type",
      title: "License Type",
      dataIndex: "license_type",
      render: (v: string) => v || "—",
    },
    {
      key: "security_profile",
      title: "Security Profile",
      dataIndex: "security_profile",
      render: (v: string) => v || "—",
    },
    {
      key: "status",
      title: "Status",
      dataIndex: "status",
      render: (v: string) => v || "—",
    },
  ];

  return (
    <AdminCompactTable<DomainUserVaultMembership>
      rowKey={(row) => row.vault_id}
      columns={columns}
      dataSource={rows}
      locale={{ emptyText: adminTableEmptyText("No vault memberships.") }}
    />
  );
}
