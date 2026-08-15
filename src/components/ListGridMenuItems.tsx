import { Button } from "antd";
import type { ListGridPreferences, ListColumn } from "../api/types";
import type { ListChrome } from "../lib/i18n/chromeTypes";
import { displayText, displayTextTemplate } from "../lib/i18n";

type Props = {
  chrome: ListChrome;
  columns: ListColumn[];
  recordLinkField?: string;
  current: ListGridPreferences;
  editColumnsAllowed?: boolean;
  disabled?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  onEditColumns?: () => void;
  onSave: (prefs: ListGridPreferences) => Promise<void>;
  close: () => void;
};

export function ListGridMenuItems({
  chrome,
  columns,
  recordLinkField,
  current,
  editColumnsAllowed,
  disabled,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onEditColumns,
  onSave,
  close,
}: Props) {
  const cellTextMode = current.cell_text_mode === "wrap" ? "wrap" : "truncate";
  const freezeColumn = current.freeze_column?.trim() ?? "";
  const firstColumn = recordLinkField || columns[0]?.field_api_name || "";

  async function apply(prefs: ListGridPreferences) {
    await onSave({
      visible_columns: current.visible_columns,
      column_order: current.column_order,
      freeze_column: current.freeze_column,
      cell_text_mode: current.cell_text_mode,
      column_widths: current.column_widths,
      ...prefs,
    });
    close();
  }

  return (
    <>
      {editColumnsAllowed && onEditColumns && (
        <Button
          type="text"
          role="menuitem"
          className="list-actions-menu__item list-actions-menu__item--edit-columns"
          disabled={disabled}
          onClick={() => {
            close();
            onEditColumns();
          }}
        >
          {displayText(chrome.edit_columns)}
        </Button>
      )}
      {firstColumn && (
        <Button
          type="text"
          role="menuitem"
          className="list-actions-menu__item"
          disabled={disabled}
          onClick={() => {
            void apply({
              freeze_column: freezeColumn ? undefined : firstColumn,
            });
          }}
        >
          {displayText(freezeColumn ? chrome.unfreeze_column : chrome.freeze_column)}
        </Button>
      )}
      <Button
        type="text"
        role="menuitem"
        className="list-actions-menu__item"
        disabled={disabled}
        onClick={() => {
          void apply({
            cell_text_mode: cellTextMode === "wrap" ? "truncate" : "wrap",
          });
        }}
      >
        {displayText(cellTextMode === "wrap" ? chrome.cell_text_truncate : chrome.cell_text_wrap)}
      </Button>
      {pageSize != null && pageSizeOptions && onPageSizeChange && (
        <>
          {pageSizeOptions.map((size) => (
            <Button
              key={size}
              type="text"
              role="menuitem"
              className={`list-actions-menu__item${pageSize === size ? " list-actions-menu__item--active" : ""}`}
              disabled={disabled}
              onClick={() => {
                onPageSizeChange(size);
                close();
              }}
            >
              {displayTextTemplate(chrome.page_size_option, { size })}
            </Button>
          ))}
        </>
      )}
    </>
  );
}
