import { Alert, Button, Dropdown, Modal, Spin } from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api, HttpError } from "../api/client";
import type { DomainUserDetailModel, DomainUserVaultMembership } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { DomainUserChrome } from "../lib/i18n/chromeTypes";
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

function yesNo(v: boolean, chrome: DomainUserChrome): string {
  return v ? displayText(chrome.yes) : displayText(chrome.no);
}

function displayName(model: DomainUserDetailModel, emptyValue: string): string {
  const parts = [model.first_name, model.last_name].map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : emptyValue;
}

/** Veeva-style Domain User detail: identity + Domain Status + Vault Memberships (read-only). */
export function AdminDomainUserDetailPage() {
  const vaultId = useVaultId();
  const { userId = "" } = useParams<{ userId: string }>();
  const { shell } = useUi();
  const du = shell.domain_user;
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

  const changeDomainStatus = useCallback(() => {
    if (!vaultId || !model || !model.can_change_domain_status || statusPending) return;
    const nextActive = !model.domain_active;
    Modal.confirm({
      title: nextActive
        ? displayText(du.change_status_to_active)
        : displayText(du.change_status_to_inactive),
      content: nextActive
        ? displayText(du.change_status_active_help)
        : displayText(du.change_status_inactive_help),
      okText: displayText(shell.confirm),
      cancelText: displayText(shell.cancel),
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
  }, [vaultId, model, statusPending, load, shell.action_failed, shell.confirm, shell.cancel, du]);

  const actionMenu: MenuProps = useMemo(() => {
    if (!model?.can_change_domain_status) {
      return { items: [] };
    }
    const label = model.domain_active
      ? displayText(du.change_status_to_inactive)
      : displayText(du.change_status_to_active);
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
  }, [model, statusPending, changeDomainStatus, du]);

  if (!vaultId) return null;

  const title = model?.username || userId;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups/domain_users">{displayText(du.list_title)}</Link>
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
      actions={
        model?.can_change_domain_status ? (
          <div className="page-header__actions">
            <Dropdown menu={actionMenu} trigger={["click"]}>
              <Button loading={statusPending}>{displayText(du.actions)}</Button>
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
  const { shell } = useUi();
  const du = shell.domain_user;
  const idBase = `domain-user-${model.user_id}`;
  const sections = [
    { id: `${idBase}-details`, title: displayText(du.details) },
    { id: `${idBase}-memberships`, title: displayText(du.vault_memberships) },
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

      <nav className="security-profile-detail__nav" aria-label={displayText(du.details)}>
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
  const { shell } = useUi();
  const du = shell.domain_user;
  const emptyValue = displayText(shell.empty_value);
  const rows: { label: string; value: ReactNode }[] = [
    { label: displayText(du.username_label), value: model.username || emptyValue },
    { label: displayText(du.name_label), value: displayName(model, emptyValue) },
    { label: displayText(du.email_label), value: model.email || emptyValue },
    { label: displayText(du.company), value: model.company_name || emptyValue },
    { label: displayText(du.col_home_domain), value: model.home_domain_id || emptyValue },
    { label: displayText(du.col_status), value: model.domain_status || emptyValue },
    { label: displayText(du.col_domain_admin), value: yesNo(model.domain_admin, du) },
    { label: displayText(du.col_cross_domain), value: yesNo(model.cross_domain, du) },
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
  const { shell } = useUi();
  const du = shell.domain_user;
  const emptyValue = displayText(shell.empty_value);
  const columns: TableColumnsType<DomainUserVaultMembership> = [
    {
      key: "vault_name",
      title: displayText(du.vault),
      dataIndex: "vault_name",
      render: (v: string) => v || emptyValue,
    },
    {
      key: "license_type",
      title: displayText(du.license_type),
      dataIndex: "license_type",
      render: (v: string) => v || emptyValue,
    },
    {
      key: "security_profile",
      title: displayText(du.security_profile),
      dataIndex: "security_profile",
      render: (v: string) => v || emptyValue,
    },
    {
      key: "status",
      title: displayText(du.membership_status),
      dataIndex: "status",
      render: (v: string) => v || emptyValue,
    },
  ];

  return (
    <AdminCompactTable<DomainUserVaultMembership>
      rowKey={(row) => row.vault_id}
      columns={columns}
      dataSource={rows}
      locale={{ emptyText: adminTableEmptyText(displayText(du.no_memberships)) }}
    />
  );
}
