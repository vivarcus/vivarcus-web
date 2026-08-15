import { Alert, Button, Input, Modal, Select, Spin } from "antd";
import { MinusCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { SavedViewDetail } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";

type Props = {
  open: boolean;
  vaultId: string;
  tabApiName: string;
  tabLabel: string;
  navigationContext: string;
  chrome: ListChrome;
  onClose: () => void;
  onChanged: () => void;
};

type SortKey = "creation_date_desc" | "name_asc";

function sortViews(views: SavedViewDetail[], sortKey: SortKey): SavedViewDetail[] {
  const sorted = [...views];
  sorted.sort((left, right) => {
    if (sortKey === "name_asc") {
      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    }
    return right.api_name.localeCompare(left.api_name);
  });
  return sorted;
}

export function EditViewsDialog({
  open,
  vaultId,
  tabApiName,
  tabLabel,
  navigationContext,
  chrome,
  onClose,
  onChanged,
}: Props) {
  const { shell } = useUi();
  const [views, setViews] = useState<SavedViewDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("creation_date_desc");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearch("");
    setSortKey("creation_date_desc");
    setLoading(true);
    setError(null);
    void api
      .listSavedViews(vaultId, tabApiName, navigationContext)
      .then((data) => {
        if (!cancelled) {
          setViews(data.views.filter((view) => view.can_delete));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : displayText(shell.load_failed));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, vaultId, tabApiName, navigationContext, shell.load_failed]);

  const filteredViews = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = query
      ? views.filter(
          (view) =>
            view.label.toLowerCase().includes(query) ||
            view.api_name.toLowerCase().includes(query) ||
            (view.owner_label ?? "").toLowerCase().includes(query),
        )
      : views;
    return sortViews(visible, sortKey);
  }, [views, search, sortKey]);

  function removeView(view: SavedViewDetail) {
    Modal.confirm({
      title: displayText(chrome.delete_view),
      content: displayText(chrome.delete_view_confirm),
      okText: displayText(chrome.delete_view),
      cancelText: displayText(shell.cancel),
      onOk: async () => {
        setError(null);
        try {
          await api.deleteSavedView(vaultId, tabApiName, view.api_name);
          setViews((current) => current.filter((item) => item.api_name !== view.api_name));
          onChanged();
        } catch (err) {
          setError(err instanceof Error ? err.message : displayText(shell.delete_failed));
          throw err;
        }
      },
    });
  }

  return (
    <Modal
      open={open}
      className="edit-views-dialog"
      title={displayTextTemplate(chrome.edit_views_title, { tab: tabLabel })}
      width={640}
      onCancel={onClose}
      footer={null}
    >
      {error && <Alert type="error" title={error} showIcon role="alert" className="edit-views-dialog__error" />}
      <div className="edit-views-dialog__toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={displayText(chrome.search_views)}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="edit-views-dialog__sort">
          <span className="edit-views-dialog__sort-label">{displayText(chrome.sort_by_label)}</span>
          <Select<SortKey>
            value={sortKey}
            onChange={setSortKey}
            options={[
              { value: "creation_date_desc", label: displayText(chrome.sort_by_creation_date) },
              { value: "name_asc", label: displayText(chrome.view_label) },
            ]}
          />
        </label>
      </div>

      {loading ? (
        <div className="edit-views-dialog__loading">
          <Spin description={displayText(shell.loading)} />
        </div>
      ) : (
        <>
          <ul className="edit-views-dialog__list">
            {filteredViews.length === 0 && (
              <li className="edit-views-dialog__empty">{displayText(chrome.empty_list)}</li>
            )}
            {filteredViews.map((view) => (
              <li key={view.api_name} className="edit-views-dialog__item">
                <div className="edit-views-dialog__item-main">
                  <strong>{view.label}</strong>
                  {view.owner_label && (
                    <span className="edit-views-dialog__owner">{view.owner_label}</span>
                  )}
                </div>
                <Button
                  type="text"
                  danger
                  className="edit-views-dialog__delete"
                  aria-label={displayText(chrome.delete_view)}
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeView(view)}
                />
              </li>
            ))}
          </ul>
          {filteredViews.length > 0 && (
            <div className="edit-views-dialog__count">
              1-{filteredViews.length} of {filteredViews.length}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
