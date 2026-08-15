import { Input, Select } from "antd";
import type { ReactNode } from "react";
import type { ViewOption } from "../api/types";
import { displayText, type ListChrome } from "../lib/i18n";

type Props = {
  chrome: ListChrome;
  loading: boolean;
  views: ViewOption[];
  selectedView: string;
  viewLabel?: (view: ViewOption) => ViewOption["label"];
  onSelectView: (viewId: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  createButton?: ReactNode;
  pagination?: ReactNode;
  actionsMenu: ReactNode;
};

export function AdminObjectListToolbar({
  chrome,
  loading,
  views,
  selectedView,
  viewLabel,
  onSelectView,
  searchValue,
  onSearchChange,
  createButton,
  pagination,
  actionsMenu,
}: Props) {
  const resolveLabel = viewLabel ?? ((view: ViewOption) => view.label);

  return (
    <div className="list-toolbar list-toolbar--veeva">
      <div className="list-toolbar__start">
        {createButton}
        {views.length > 0 && (
          <Select
            className="list-toolbar__view-select"
            value={selectedView}
            disabled={loading}
            popupMatchSelectWidth={false}
            options={views.map((view) => ({
              value: view.id,
              label: displayText(resolveLabel(view), view.id),
            }))}
            onChange={onSelectView}
          />
        )}
        <Input.Search
          className="list-toolbar__search"
          value={searchValue}
          placeholder={displayText(chrome.search_columns)}
          aria-label={displayText(chrome.search_columns)}
          disabled={loading}
          allowClear
          onChange={(e) => onSearchChange(e.target.value)}
          onSearch={onSearchChange}
        />
      </div>
      <div className="list-toolbar__end">
        {pagination}
        {actionsMenu}
      </div>
    </div>
  );
}
