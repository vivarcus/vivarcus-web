import { Alert, Button, Form, Input, Space, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { UsersGroupsPanelModel } from "../api/types";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import {
  downloadUsersGroupsExport,
  type UsersGroupsView,
} from "../lib/usersGroupsExport";

const VALID_VIEWS = new Set<string>(["domain_users"]);

function parseViewKind(view: string | undefined): UsersGroupsView | null {
  if (view && VALID_VIEWS.has(view)) {
    return view as UsersGroupsView;
  }
  return null;
}

export function AdminUsersGroupsPage() {
  const vaultId = useVaultId();
  const { view } = useParams<{ view: string }>();
  const { shell } = useUi();
  const du = shell.domain_user;
  const emptyValue = displayText(shell.empty_value);
  const [model, setModel] = useState<UsersGroupsPanelModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const viewKind = parseViewKind(view);
  const title =
    viewKind === "domain_users"
      ? displayText(du.list_title)
      : displayText(shell.admin_users_groups);

  const load = useCallback(
    async (pageToken?: string, search = searchApplied) => {
      if (!vaultId || !viewKind) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.usersGroupsPanel(vaultId, viewKind, {
          page_token: pageToken,
          page_size: 50,
          search: search || undefined,
        });
        setModel(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(shell.load_failed));
        setModel(null);
      } finally {
        setLoading(false);
      }
    },
    [vaultId, viewKind, searchApplied, shell.load_failed],
  );

  useEffect(() => {
    setSearchDraft("");
    setSearchApplied("");
  }, [viewKind]);

  useEffect(() => {
    void load(undefined, searchApplied);
  }, [load, searchApplied]);

  const runExport = async () => {
    if (!vaultId || !viewKind || !model?.actions.export_allowed) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadUsersGroupsExport(vaultId, viewKind, searchApplied || undefined);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setExporting(false);
    }
  };

  const applySearch = () => {
    setSearchApplied(searchDraft.trim());
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearchApplied("");
  };

  const columns: TableColumnsType<Record<string, string>> = useMemo(() => {
    if (!model) return [];
    return model.columns.map((col) => ({
      title: col.label,
      dataIndex: col.key,
      key: col.key,
      render: (_: unknown, row: Record<string, string>) => {
        if (viewKind === "domain_users" && col.key === "username" && row.user_id) {
          return (
            <Link to={`/admin/users-groups/domain_users/${encodeURIComponent(row.user_id)}`}>
              {row.username || emptyValue}
            </Link>
          );
        }
        return row[col.key] || emptyValue;
      },
    }));
  }, [model, viewKind, emptyValue]);

  const dataSource = useMemo(() => {
    if (!model) return [];
    return model.rows.map((row, index) => ({
      key: row.cells.user_id || `${index}`,
      ...row.cells,
    }));
  }, [model]);

  if (!vaultId) {
    return null;
  }

  if (!viewKind) {
    return <Alert type="error" showIcon title={displayText(du.unknown_view)} />;
  }

  return (
    <AdminPageShell
      title={title}
      actions={
        <div className="page-header__actions">
          <Space>
            {model?.actions.export_allowed && (
              <Button loading={exporting} disabled={loading} onClick={() => void runExport()}>
                {displayText(du.export_csv)}
              </Button>
            )}
          </Space>
        </div>
      }
    >
        <Form
          className="filter-bar"
          layout="inline"
          requiredMark={false}
          onFinish={applySearch}
        >
          <Form.Item label={displayText(shell.global_search_submit)}>
            <Input
              value={searchDraft}
              placeholder={displayText(du.search_placeholder)}
              onChange={(e) => setSearchDraft(e.target.value)}
              onPressEnter={applySearch}
            />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" disabled={loading}>
              {displayText(shell.apply)}
            </Button>
          </Form.Item>
          <Form.Item>
            <Button disabled={loading || (!searchDraft && !searchApplied)} onClick={clearSearch}>
              {displayText(shell.clear)}
            </Button>
          </Form.Item>
        </Form>

        {exportError && (
          <Alert type="error" title={exportError} showIcon className="admin-page__banner" />
        )}
        {error && <Alert type="error" title={error} showIcon role="alert" />}
        {loading && !model && (
          <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
        )}

        {model && (
          <>
            {dataSource.length === 0 && model.empty_message && (
              <Alert type="info" showIcon title={model.empty_message} className="admin-page__banner" />
            )}
            <AdminCompactTable
              loadingOverlay={loading}
              columns={columns}
              dataSource={dataSource}
            />
            <div className="pagination-bar">
              {model.pagination.has_previous && (
                <Button disabled={loading} onClick={() => void load()}>
                  {displayText(shell.first_page)}
                </Button>
              )}
              {model.pagination.next_page_token && (
                <Button
                  disabled={loading}
                  onClick={() => void load(model.pagination.next_page_token)}
                >
                  {displayText(shell.next_page)}
                </Button>
              )}
            </div>
          </>
        )}
    </AdminPageShell>
  );
}
