import { Alert, Button, Modal, Select, Spin, Table, type TableColumnsType } from "antd";
import { CloseOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { SharingPanelModel, SharingPanelRow } from "../api/types";
import { useUi } from "../context/UiContext";
import {
  defaultSharingChrome,
  displayText,
  displayTextTemplate,
  type SharingChrome,
} from "../lib/i18n";
import { SharingAddDialog } from "./SharingAddDialog";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
};

export function RecordSharingPanel({ vaultId, objectName, recordId }: Props) {
  const { shell } = useUi();
  const [panel, setPanel] = useState<SharingPanelModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const chrome: SharingChrome = { ...defaultSharingChrome, ...(panel?.chrome ?? {}) };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.recordSharingPanel(vaultId, objectName, recordId, {
        role: roleFilter || undefined,
        member: memberFilter || undefined,
      });
      setPanel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setPanel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, objectName, recordId, roleFilter, memberFilter, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeGrant = useCallback(
    (row: SharingPanelRow) => {
      Modal.confirm({
        title: displayText(chrome.remove),
        content: displayTextTemplate(chrome.remove_confirm, { member: row.member_name }),
        okText: displayText(chrome.remove),
        cancelText: displayText(chrome.add_cancel),
        okButtonProps: { danger: true },
        onOk: async () => {
          setRemovingId(row.id);
          setError(null);
          try {
            await api.removeSharingGrant(vaultId, objectName, recordId, row.id);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : displayText(chrome.remove_failed));
            throw err;
          } finally {
            setRemovingId(null);
          }
        },
      });
    },
    [vaultId, objectName, recordId, load, chrome],
  );

  const columns = useMemo<TableColumnsType<SharingPanelRow>>(() => {
    const iconLabel = displayText(chrome.member_user_aria);
    const groupLabel = displayText(chrome.member_group_aria);
    return [
      {
        key: "member_icon",
        width: 40,
        render: (_value, row) => (
          <span
            className="sharing-panel__member-icon"
            aria-label={row.member_kind === "group" ? groupLabel : iconLabel}
            title={row.member_kind === "group" ? groupLabel : iconLabel}
          >
            {row.member_kind === "group" ? "👥" : "👤"}
          </span>
        ),
      },
      {
        title: "Name",
        dataIndex: "member_name",
        key: "member_name",
      },
      {
        title: "Role",
        dataIndex: "role_label",
        key: "role_label",
      },
      {
        title: "Sharing Rules",
        key: "sharing_rule",
        render: (_value, row) =>
          row.display_rule ? (
            <Button type="link" className="sharing-panel__display-rule" disabled>
              {displayText(chrome.display_rule)}
            </Button>
          ) : null,
      },
      {
        title: "Access",
        dataIndex: "access",
        key: "access",
      },
      ...(panel?.actions.remove_allowed
        ? [
            {
              key: "remove",
              width: 48,
              render: (_value: unknown, row: SharingPanelRow) =>
                !row.read_only ? (
                  <Button
                    type="text"
                    size="small"
                    className="sharing-panel__remove"
                    aria-label={displayText(chrome.remove)}
                    title={displayText(chrome.remove)}
                    icon={<CloseOutlined />}
                    loading={removingId === row.id}
                    onClick={() => removeGrant(row)}
                  />
                ) : null,
            } satisfies TableColumnsType<SharingPanelRow>[number],
          ]
        : []),
    ];
  }, [chrome, panel?.actions.remove_allowed, removingId, removeGrant]);

  const roleOptions = useMemo(
    () =>
      (panel?.filters.roles ?? [{ value: "", label: displayText(chrome.all_roles) }]).map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    [panel?.filters.roles, chrome.all_roles],
  );

  const addRoleOptions = useMemo(
    () =>
      (panel?.filters.roles ?? [])
        .filter((opt) => opt.value && opt.value !== "owner__v")
        .map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
    [panel?.filters.roles],
  );

  const memberOptions = useMemo(
    () =>
      (panel?.filters.members ?? [{ value: "", label: displayText(chrome.all_users_and_groups) }]).map(
        (opt) => ({
          value: opt.value,
          label: opt.label,
        }),
      ),
    [panel?.filters.members, chrome.all_users_and_groups],
  );

  const paginationLabel =
    panel && panel.pagination.total > 0
      ? displayTextTemplate(chrome.pagination_template, {
          start: panel.pagination.page_start,
          end: panel.pagination.page_end,
          total: panel.pagination.total,
        })
      : "";

  return (
    <div className="sharing-panel sharing-panel--veeva">
      <header className="sharing-panel__header">
        <h2 className="sharing-panel__title">
          {displayText(chrome.title)}
          <QuestionCircleOutlined className="sharing-panel__help" title={displayText(chrome.help)} />
        </h2>
      </header>

      <div className="sharing-panel__toolbar">
        <div className="sharing-panel__filters">
          <span className="sharing-panel__filter-icon" aria-hidden>
            ☰
          </span>
          <Select
            className="sharing-panel__filter-select"
            value={roleFilter}
            options={roleOptions}
            onChange={(value) => setRoleFilter(value)}
            disabled={loading}
          />
          <Select
            className="sharing-panel__filter-select sharing-panel__filter-select--wide"
            value={memberFilter}
            options={memberOptions}
            onChange={(value) => setMemberFilter(value)}
            disabled={loading}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div className="sharing-panel__actions">
          {panel?.actions.add_allowed && (
            <Button className="sharing-panel__add" onClick={() => setAddOpen(true)}>
              + {displayText(chrome.add)}
            </Button>
          )}
          {paginationLabel && (
            <span className="sharing-panel__pagination">{paginationLabel}</span>
          )}
        </div>
      </div>

      {error && <Alert type="error" title={error} showIcon className="sharing-panel__error" />}
      {loading && !panel && (
        <Spin description={displayText(chrome.loading)} className="sharing-panel__loading" />
      )}
      {panel && (
        <Table<SharingPanelRow>
          className="sharing-panel__table"
          columns={columns}
          dataSource={panel.rows}
          rowKey="id"
          pagination={false}
          loading={loading}
          locale={{ emptyText: displayText(chrome.empty_rows) }}
          size="small"
        />
      )}
      {panel?.actions.add_allowed && (
        <SharingAddDialog
          open={addOpen}
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
          chrome={chrome}
          roleOptions={addRoleOptions}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}
