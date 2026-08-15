import { Alert, Button, Modal, Select, Spin, message } from "antd";
import type { MenuProps } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { SandboxSnapshotRow, SandboxSnapshotsModel } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { SandboxDeploymentTable } from "../components/sandbox/SandboxDeploymentTable";
import { SandboxRowActionMenu } from "../components/sandbox/SandboxRowActionMenu";
import { sandboxEllipsisCell, sandboxFirstColumnCell } from "../components/sandbox/sandboxTableCells";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

function snapshotRowHasActions(row: SandboxSnapshotRow): boolean {
  return row.can_update || row.can_upgrade || row.can_change_source || row.can_delete;
}

function formatTemplate(template: string, name: string): string {
  return template.replaceAll("{0}", name);
}

/** Sum of column widths — keep ≤ typical admin content width to avoid forced scroll + clipped headers. */
const TABLE_SCROLL_X = 1120;

export function AdminSandboxSnapshotsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceSandboxFilter = (searchParams.get("source_sandbox_id") || "").trim();
  const { shell } = useUi();
  const [model, setModel] = useState<SandboxSnapshotsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [changeRow, setChangeRow] = useState<SandboxSnapshotRow | null>(null);
  const [changeSourceId, setChangeSourceId] = useState<string>("");
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSandboxSnapshots(vaultId);
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

  const changeSourceOptions = useMemo(() => {
    if (!model || !changeRow) return [];
    return model.change_source_candidates
      .filter((opt) => {
        if (opt.id === changeRow.source_sandbox_id) return false;
        if (opt.available <= 0) return false;
        if (changeRow.release && opt.release && opt.release !== changeRow.release) return false;
        return true;
      })
      .map((opt) => ({ value: opt.id, label: `${opt.name} (${opt.available})` }));
  }, [model, changeRow]);

  const visibleSnapshots = useMemo(() => {
    if (!model) return [];
    if (!sourceSandboxFilter) return model.snapshots;
    return model.snapshots.filter((row) => row.source_sandbox_id === sourceSandboxFilter);
  }, [model, sourceSandboxFilter]);

  const sectionTitle = useMemo(() => {
    if (!model) return "";
    if (!sourceSandboxFilter) return displayText(model.chrome.all_snapshots_title);
    const match = model.snapshots.find((row) => row.source_sandbox_id === sourceSandboxFilter);
    const name = match?.source_sandbox?.trim();
    if (name) return `${displayText(model.chrome.all_snapshots_title)} — ${name}`;
    return displayText(model.chrome.all_snapshots_title);
  }, [model, sourceSandboxFilter]);

  const confirmUpdate = (row: SandboxSnapshotRow) => {
    if (!vaultId || !model) return;
    Modal.confirm({
      title: displayText(model.chrome.update_action),
      content: formatTemplate(displayText(model.chrome.update_confirm), row.name),
      okText: displayText(model.chrome.confirm),
      cancelText: displayText(model.chrome.cancel),
      onOk: async () => {
        setActingId(row.id);
        try {
          const result = await api.updateSandboxSnapshot(vaultId, row.id);
          message.success(result.message || displayText(model.chrome.update_success));
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
        } finally {
          setActingId(null);
        }
      },
    });
  };

  const confirmUpgrade = (row: SandboxSnapshotRow) => {
    if (!vaultId || !model) return;
    Modal.confirm({
      title: displayText(model.chrome.upgrade_action),
      content: formatTemplate(displayText(model.chrome.upgrade_confirm), row.name),
      okText: displayText(model.chrome.confirm),
      cancelText: displayText(model.chrome.cancel),
      onOk: async () => {
        setActingId(row.id);
        try {
          const result = await api.upgradeSandboxSnapshot(vaultId, row.id);
          message.success(result.message || displayText(model.chrome.upgrade_success));
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
        } finally {
          setActingId(null);
        }
      },
    });
  };

  const confirmDelete = (row: SandboxSnapshotRow) => {
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
          const result = await api.deleteSandboxSnapshot(vaultId, row.id);
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

  const openChangeSource = (row: SandboxSnapshotRow) => {
    setChangeRow(row);
    setChangeSourceId("");
  };

  const submitChangeSource = async () => {
    if (!vaultId || !model || !changeRow || !changeSourceId) return;
    setChanging(true);
    try {
      const result = await api.changeSandboxSnapshotSource(vaultId, changeRow.id, {
        new_source_sandbox_id: changeSourceId,
      });
      message.success(result.message || displayText(model.chrome.change_source_success));
      setChangeRow(null);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setChanging(false);
    }
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

  const renderRowActionMenu = (row: SandboxSnapshotRow) => {
    if (!snapshotRowHasActions(row)) return null;
    const items: MenuProps["items"] = [
      {
        key: "update",
        label: displayText(chrome.update_action),
        disabled: !row.can_update || actingId === row.id,
        onClick: () => confirmUpdate(row),
      },
      {
        key: "upgrade",
        label: displayText(chrome.upgrade_action),
        disabled: !row.can_upgrade || actingId === row.id,
        onClick: () => confirmUpgrade(row),
      },
      {
        key: "change_source",
        label: displayText(chrome.change_source_action),
        disabled: !row.can_change_source || actingId === row.id,
        onClick: () => openChangeSource(row),
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

  const columns = [
    {
      title: displayText(chrome.column_name),
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
      render: (value: string | undefined, row: SandboxSnapshotRow) =>
        sandboxFirstColumnCell(value, renderRowActionMenu(row)),
    },
    {
      title: displayText(chrome.column_description),
      dataIndex: "description",
      key: "description",
      width: 200,
      ellipsis: true,
      render: (value: string | undefined) => sandboxEllipsisCell(value),
    },
    {
      title: displayText(chrome.column_source_sandbox),
      dataIndex: "source_sandbox",
      key: "source_sandbox",
      width: 180,
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
      title: displayText(chrome.column_include_data),
      dataIndex: "include_data",
      key: "include_data",
      width: 120,
      render: (value: boolean) => (value ? displayText(chrome.yes) : displayText(chrome.no)),
    },
    {
      title: displayText(chrome.column_status),
      dataIndex: "status",
      key: "status",
      width: 100,
    },
    {
      title: displayText(chrome.column_upgrade_status),
      dataIndex: "upgrade_status",
      key: "upgrade_status",
      width: 130,
    },
    {
      title: displayText(chrome.column_expiration_date),
      dataIndex: "expiration_date",
      key: "expiration_date",
      width: 120,
      render: (value: string | undefined) => value || "",
    },
  ];

  return (
    <AdminPageShell
      title={displayText(chrome.page_title)}
      actions={
        <div className="admin-page__meta">
          {displayText(chrome.available_label)}: {model.available}
        </div>
      }
    >
      {error && <Alert type="error" showIcon message={error} className="admin-page__banner" />}

      <AdminPageSection
        title={sectionTitle}
        actions={
          <Button
            type="primary"
            disabled={!model.can_create}
            onClick={() => navigate("/admin/deployment/sandbox_snapshots/new")}
          >
            {displayText(chrome.create_button)}
          </Button>
        }
      >
        <Spin spinning={loading}>
          <SandboxDeploymentTable<SandboxSnapshotRow>
            scrollX={TABLE_SCROLL_X}
            loading={loading}
            rowKey="id"
            dataSource={visibleSnapshots}
            columns={columns}
            locale={{ emptyText: displayText(chrome.empty_list) }}
          />
        </Spin>
      </AdminPageSection>

      <Modal
        title={displayText(chrome.change_source_title)}
        open={!!changeRow}
        onCancel={() => setChangeRow(null)}
        onOk={() => void submitChangeSource()}
        confirmLoading={changing}
        okText={displayText(chrome.confirm)}
        cancelText={displayText(chrome.cancel)}
        okButtonProps={{ disabled: !changeSourceId }}
        destroyOnHidden
      >
        <Select
          className="admin-page__full-width"
          placeholder={displayText(chrome.field_source_sandbox)}
          options={changeSourceOptions}
          value={changeSourceId || undefined}
          onChange={(value) => setChangeSourceId(value)}
        />
      </Modal>
    </AdminPageShell>
  );
}
