import { Alert, Button, Modal, Spin, message } from "antd";
import type { MenuProps } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ActiveSandboxVault, SandboxEntitlement, SandboxVaultsModel } from "../api/types";
import { SandboxDeploymentTable } from "../components/sandbox/SandboxDeploymentTable";
import { SandboxRowActionMenu } from "../components/sandbox/SandboxRowActionMenu";
import { sandboxEllipsisCell, sandboxFirstColumnCell } from "../components/sandbox/sandboxTableCells";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

function vaultRowHasActions(row: ActiveSandboxVault): boolean {
  return row.can_refresh || row.can_delete;
}

function formatTemplate(template: string, name: string): string {
  return template.replaceAll("{0}", name);
}

/** Sum of active column widths — keep ≤ typical admin content width to avoid forced scroll + clipped headers. */
const ACTIVE_TABLE_SCROLL_X = 1090;

export function AdminSandboxVaultsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<SandboxVaultsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSandboxVaults(vaultId);
      setModel(data);
    } catch (err) {
      setModel(null);
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEnabled = useMemo(() => {
    if (!model) return false;
    return model.can_create && model.entitlements.some((row) => row.available > 0);
  }, [model]);

  const confirmRefresh = (row: ActiveSandboxVault) => {
    if (!vaultId || !model) return;
    Modal.confirm({
      title: displayText(model.chrome.refresh_action),
      content: formatTemplate(displayText(model.chrome.refresh_confirm), row.name),
      okText: displayText(model.chrome.refresh_action),
      cancelText: displayText(model.chrome.cancel),
      onOk: async () => {
        setActingId(row.id);
        try {
          const result = await api.refreshSandboxVault(vaultId, row.id);
          message.success(result.message || displayText(model.chrome.refresh_success));
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
        } finally {
          setActingId(null);
        }
      },
    });
  };

  const confirmDelete = (row: ActiveSandboxVault) => {
    if (!vaultId || !model) return;
    Modal.confirm({
      title: displayText(model.chrome.delete_action),
      content: formatTemplate(displayText(model.chrome.delete_confirm), row.name),
      okText: displayText(model.chrome.delete_action),
      okButtonProps: { danger: true },
      cancelText: displayText(model.chrome.cancel),
      onOk: async () => {
        setActingId(row.id);
        try {
          const result = await api.deleteSandboxVault(vaultId, row.id);
          message.success(result.message || displayText(model.chrome.delete_success));
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
        } finally {
          setActingId(null);
        }
      },
    });
  };

  if (!vaultId) return null;

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return <Alert type="error" showIcon message={error} />;
  }

  if (!model) return null;

  const chrome = model.chrome;

  const entitlementColumns = [
    {
      title: displayText(chrome.column_size),
      dataIndex: "size_label",
      key: "size",
      width: 100,
    },
    {
      title: displayText(chrome.column_available),
      dataIndex: "available",
      key: "available",
      width: 100,
      align: "right" as const,
    },
    {
      title: displayText(chrome.column_allowed),
      dataIndex: "allowed",
      key: "allowed",
      width: 100,
      align: "right" as const,
    },
    {
      title: displayText(chrome.column_prerelease_available),
      dataIndex: "prerelease_available",
      key: "prerelease_available",
      width: 160,
      align: "right" as const,
    },
  ];

  const renderRowActionMenu = (row: ActiveSandboxVault) => {
    if (!vaultRowHasActions(row)) return null;
    const items: MenuProps["items"] = [
      {
        key: "refresh",
        label: displayText(chrome.refresh_action),
        disabled: !row.can_refresh || actingId === row.id,
        onClick: () => confirmRefresh(row),
      },
      {
        key: "delete",
        label: displayText(chrome.delete_action),
        danger: true,
        disabled: !row.can_delete || actingId === row.id,
        onClick: () => confirmDelete(row),
      },
    ];
    return <SandboxRowActionMenu items={items} loading={actingId === row.id} />;
  };

  const activeColumns = [
    {
      title: displayText(chrome.column_name),
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
      render: (value: string | undefined, row: ActiveSandboxVault) =>
        sandboxFirstColumnCell(value, renderRowActionMenu(row)),
    },
    {
      title: displayText(chrome.column_source_vault),
      dataIndex: "source_vault",
      key: "source_vault",
      width: 160,
      ellipsis: true,
      render: (value: string | undefined) => sandboxEllipsisCell(value),
    },
    {
      title: displayText(chrome.column_release),
      dataIndex: "release",
      key: "release",
      width: 90,
    },
    {
      title: displayText(chrome.column_type),
      dataIndex: "type",
      key: "type",
      width: 120,
    },
    {
      title: displayText(chrome.column_size),
      dataIndex: "size_label",
      key: "size",
      width: 80,
    },
    {
      title: displayText(chrome.column_status),
      dataIndex: "status_label",
      key: "status",
      width: 90,
    },
    {
      title: displayText(chrome.column_expiration_date),
      dataIndex: "expiration_date",
      key: "expiration_date",
      width: 120,
      render: (value: string | undefined) => value || "",
    },
    {
      title: displayText(chrome.column_domain),
      dataIndex: "domain",
      key: "domain",
      width: 180,
      ellipsis: true,
      render: (value: string | undefined) => sandboxEllipsisCell(value),
    },
    {
      title: displayText(chrome.column_pod),
      dataIndex: "pod",
      key: "pod",
      width: 80,
    },
    {
      title: displayText(chrome.column_refresh_available),
      dataIndex: "refresh_available_label",
      key: "refresh_available",
      width: 150,
      render: (value: string | undefined) => value || "",
    },
  ];

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      {error && <Alert type="error" showIcon message={error} className="admin-page__banner" />}

      <div className="admin-page__body">
        <AdminPageSection
          title={displayText(chrome.available_section_title)}
          note={displayText(chrome.prerelease_available_link)}
        >
          <SandboxDeploymentTable<SandboxEntitlement>
            className="sandbox-deployment__entitlements-table"
            compact
            fixedLayout
            rowKey="size"
            dataSource={model.entitlements}
            columns={entitlementColumns}
            locale={{ emptyText: displayText(chrome.empty_list) }}
          />
        </AdminPageSection>

        <AdminPageSection
          title={displayText(chrome.active_section_title)}
          actions={
            <Button
              type="primary"
              disabled={!createEnabled}
              onClick={() => navigate("/admin/deployment/sandbox_vaults/new")}
            >
              {displayText(chrome.create_button)}
            </Button>
          }
        >
          <Spin spinning={loading}>
            <SandboxDeploymentTable<ActiveSandboxVault>
              scrollX={ACTIVE_TABLE_SCROLL_X}
              loading={loading}
              rowKey="id"
              dataSource={model.active}
              columns={activeColumns}
              locale={{ emptyText: displayText(chrome.empty_list) }}
            />
          </Spin>
        </AdminPageSection>
      </div>
    </AdminPageShell>
  );
}
