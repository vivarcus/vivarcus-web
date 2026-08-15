import { Button, Form, Input, Modal, Radio, Select } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ListColumn, ListGridPreferences } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";
import {
  emptyListboxSelection,
  handleListboxClick,
  isListboxItemSelected,
  preventMouseDownFocusLoss,
  reorderSelectedBlock,
  reorderSelectedToEdge,
  selectedFieldsInOrder,
  selectedIndicesInOrder,
  type ListboxSelection,
} from "../lib/listboxSelection";

type Props = {
  open: boolean;
  chrome: ListChrome;
  availableColumns: ListColumn[];
  defaultColumns: ListColumn[];
  current: ListGridPreferences;
  onClose: () => void;
  onSave: (prefs: ListGridPreferences) => void | Promise<void>;
};

function defaultSelectedOrder(
  defaultColumns: ListColumn[],
  current: ListGridPreferences,
): string[] {
  const visible =
    current.visible_columns && current.visible_columns.length > 0
      ? [...current.visible_columns]
      : defaultColumns.map((col) => col.field_api_name);

  if (current.column_order && current.column_order.length > 0) {
    const allowed = new Set(visible);
    const ordered = current.column_order.filter((name) => allowed.has(name));
    for (const name of visible) {
      if (!ordered.includes(name)) {
        ordered.push(name);
      }
    }
    return ordered;
  }

  return visible;
}

function defaultOrderFromColumns(columns: ListColumn[]): string[] {
  return columns.map((col) => col.field_api_name);
}

function asColumnList(value: unknown, fallback: ListColumn[] = []): ListColumn[] {
  return Array.isArray(value) ? value : fallback;
}

export function EditColumnsDialog({
  open,
  chrome,
  availableColumns,
  defaultColumns,
  current,
  onClose,
  onSave,
}: Props) {
  const { shell } = useUi();
  const resolvedAvailableColumns = asColumnList(availableColumns);
  const resolvedDefaultColumns = asColumnList(
    defaultColumns,
    resolvedAvailableColumns,
  );
  const [selectedOrder, setSelectedOrder] = useState<string[]>(() =>
    defaultSelectedOrder(resolvedDefaultColumns, current),
  );
  const [availableSelection, setAvailableSelection] = useState<ListboxSelection>(() =>
    emptyListboxSelection(),
  );
  const [selectedSelection, setSelectedSelection] = useState<ListboxSelection>(() =>
    emptyListboxSelection(),
  );
  const availableSelectionRef = useRef(availableSelection);
  const selectedSelectionRef = useRef(selectedSelection);
  availableSelectionRef.current = availableSelection;
  selectedSelectionRef.current = selectedSelection;
  const [search, setSearch] = useState("");
  const [freezeColumn, setFreezeColumn] = useState(current.freeze_column ?? "");
  const [cellTextMode, setCellTextMode] = useState<"truncate" | "wrap">(
    current.cell_text_mode === "wrap" ? "wrap" : "truncate",
  );
  const [saving, setSaving] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = true;
    setSelectedOrder(defaultSelectedOrder(resolvedDefaultColumns, current));
    setAvailableSelection(emptyListboxSelection());
    setSelectedSelection(emptyListboxSelection());
    setSearch("");
    setFreezeColumn(current.freeze_column ?? "");
    setCellTextMode(current.cell_text_mode === "wrap" ? "wrap" : "truncate");
  }, [open, resolvedAvailableColumns, resolvedDefaultColumns, current]);

  const labelByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of resolvedAvailableColumns) {
      map.set(col.field_api_name, displayText(col.label, col.field_api_name));
    }
    for (const col of resolvedDefaultColumns) {
      if (!map.has(col.field_api_name)) {
        map.set(col.field_api_name, displayText(col.label, col.field_api_name));
      }
    }
    return map;
  }, [resolvedAvailableColumns, resolvedDefaultColumns]);

  const selectedSet = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const availableItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resolvedAvailableColumns.filter((col) => {
      if (selectedSet.has(col.field_api_name)) {
        return false;
      }
      if (!query) {
        return true;
      }
      const label = labelByField.get(col.field_api_name) ?? col.field_api_name;
      return label.toLowerCase().includes(query) || col.field_api_name.toLowerCase().includes(query);
    });
  }, [resolvedAvailableColumns, labelByField, search, selectedSet]);

  const allAvailableFields = useMemo(
    () =>
      resolvedAvailableColumns
        .filter((col) => !selectedSet.has(col.field_api_name))
        .map((col) => col.field_api_name),
    [resolvedAvailableColumns, selectedSet],
  );

  function restoreDefaults() {
    const order = defaultOrderFromColumns(resolvedDefaultColumns);
    setSelectedOrder(order);
    setAvailableSelection(emptyListboxSelection());
    setSelectedSelection(emptyListboxSelection());
    setSearch("");
  }

  function moveToSelected(fields: string[]) {
    if (fields.length === 0) return;
    setSelectedOrder((prev) => {
      const next = [...prev];
      for (const field of fields) {
        if (!next.includes(field)) {
          next.push(field);
        }
      }
      return next;
    });
    setAvailableSelection(emptyListboxSelection());
  }

  function moveToAvailable(fields: string[]) {
    if (fields.length === 0) return;
    const remove = new Set(fields);
    setSelectedOrder((prev) => prev.filter((field) => !remove.has(field)));
    setSelectedSelection((prev) => {
      const next = new Set(prev.selected);
      for (const field of fields) {
        next.delete(field);
      }
      return { selected: next, anchor: next.has(prev.anchor ?? "") ? prev.anchor : null };
    });
    if (remove.has(freezeColumn)) {
      setFreezeColumn("");
    }
  }

  function moveSelected(delta: number) {
    const selection = selectedSelectionRef.current;
    if (selection.selected.size === 0) return;
    setSelectedOrder((prev) => reorderSelectedBlock(prev, selection.selected, delta));
  }

  function moveSelectedToEdge(toTop: boolean) {
    const selection = selectedSelectionRef.current;
    if (selection.selected.size === 0) return;
    setSelectedOrder((prev) => reorderSelectedToEdge(prev, selection.selected, toTop));
  }

  async function handleSave() {
    if (selectedOrder.length === 0) return;
    setSaving(true);
    try {
      await onSave({
        visible_columns: selectedOrder,
        column_order: selectedOrder,
        freeze_column: freezeColumn || undefined,
        cell_text_mode: cellTextMode,
        column_widths: current.column_widths,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const availableFieldOrder = useMemo(
    () => availableItems.map((col) => col.field_api_name),
    [availableItems],
  );

  const selectedIndices = selectedIndicesInOrder(selectedSelection, selectedOrder);
  const firstSelectedIndex = selectedIndices.length > 0 ? Math.min(...selectedIndices) : -1;
  const lastSelectedIndex = selectedIndices.length > 0 ? Math.max(...selectedIndices) : -1;

  return (
    <Modal
      open={open}
      className="edit-columns-dialog"
      title={displayText(chrome.edit_columns_title)}
      width={760}
      onCancel={onClose}
      footer={[
        <Button key="cancel" disabled={saving} onClick={onClose}>
          {displayText(shell.cancel)}
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={selectedOrder.length === 0}
          onClick={() => void handleSave()}
        >
          {displayText(shell.save)}
        </Button>,
      ]}
    >
      <div className="edit-columns-dialog__controls">
        <Input.Search
          className="edit-columns-dialog__search"
          value={search}
          placeholder={displayText(chrome.columns_search_placeholder)}
          aria-label={displayText(chrome.columns_search_placeholder)}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button disabled={saving} onClick={restoreDefaults}>
          {displayText(chrome.restore_defaults)}
        </Button>
      </div>

      <div className="edit-columns-dialog__transfer">
        <div className="edit-columns-dialog__panel">
          <div className="edit-columns-dialog__panel-title">
            {displayText(chrome.available_columns)}
          </div>
          <ul
            className="edit-columns-dialog__listbox"
            role="listbox"
            aria-label={displayText(chrome.available_columns)}
            aria-multiselectable="true"
          >
            {availableItems.map((col) => (
              <li
                key={col.field_api_name}
                role="option"
                aria-selected={isListboxItemSelected(availableSelection, col.field_api_name)}
                className={`edit-columns-dialog__option${
                  isListboxItemSelected(availableSelection, col.field_api_name)
                    ? " edit-columns-dialog__option--active"
                    : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  setAvailableSelection((prev) =>
                    handleListboxClick(col.field_api_name, availableFieldOrder, event, prev),
                  );
                }}
                onDoubleClick={() => moveToSelected([col.field_api_name])}
              >
                {labelByField.get(col.field_api_name) ?? col.field_api_name}
              </li>
            ))}
          </ul>
        </div>

        <div className="edit-columns-dialog__transfer-actions">
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={allAvailableFields.length === 0}
            aria-label={displayText(chrome.move_all_right)}
            title={displayText(chrome.move_all_right)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveToSelected(allAvailableFields)}
          >
            »
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={availableSelection.selected.size === 0}
            aria-label={displayText(chrome.move_right)}
            title={displayText(chrome.move_right)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() =>
              moveToSelected(
                selectedFieldsInOrder(availableSelectionRef.current, availableFieldOrder),
              )
            }
          >
            ›
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={selectedSelection.selected.size === 0}
            aria-label={displayText(chrome.move_left)}
            title={displayText(chrome.move_left)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() =>
              moveToAvailable(selectedFieldsInOrder(selectedSelectionRef.current, selectedOrder))
            }
          >
            ‹
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={selectedOrder.length === 0}
            aria-label={displayText(chrome.move_all_left)}
            title={displayText(chrome.move_all_left)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveToAvailable([...selectedOrder])}
          >
            «
          </Button>
        </div>

        <div className="edit-columns-dialog__panel">
          <div className="edit-columns-dialog__panel-title">
            {displayText(chrome.selected_columns)}
          </div>
          <ul
            className="edit-columns-dialog__listbox"
            role="listbox"
            aria-label={displayText(chrome.selected_columns)}
            aria-multiselectable="true"
          >
            {selectedOrder.map((field) => (
              <li
                key={field}
                role="option"
                aria-selected={isListboxItemSelected(selectedSelection, field)}
                className={`edit-columns-dialog__option${
                  isListboxItemSelected(selectedSelection, field)
                    ? " edit-columns-dialog__option--active"
                    : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  setSelectedSelection((prev) =>
                    handleListboxClick(field, selectedOrder, event, prev),
                  );
                }}
                onDoubleClick={() => moveToAvailable([field])}
              >
                {labelByField.get(field) ?? field}
              </li>
            ))}
          </ul>
        </div>

        <div className="edit-columns-dialog__reorder-actions">
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={firstSelectedIndex <= 0}
            aria-label={displayText(chrome.move_to_top)}
            title={displayText(chrome.move_to_top)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveSelectedToEdge(true)}
          >
            ⤒
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={firstSelectedIndex <= 0}
            aria-label={displayText(chrome.move_up)}
            title={displayText(chrome.move_up)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveSelected(-1)}
          >
            ↑
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={lastSelectedIndex < 0 || lastSelectedIndex >= selectedOrder.length - 1}
            aria-label={displayText(chrome.move_down)}
            title={displayText(chrome.move_down)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveSelected(1)}
          >
            ↓
          </Button>
          <Button
            className="edit-columns-dialog__icon-btn"
            disabled={lastSelectedIndex < 0 || lastSelectedIndex >= selectedOrder.length - 1}
            aria-label={displayText(chrome.move_to_bottom)}
            title={displayText(chrome.move_to_bottom)}
            onMouseDown={preventMouseDownFocusLoss}
            onClick={() => moveSelectedToEdge(false)}
          >
            ⤓
          </Button>
        </div>
      </div>

      <section className="edit-columns-dialog__preferences">
        <h3 className="edit-columns-dialog__preferences-title">
          {displayText(chrome.display_preferences)}
        </h3>
        <div className="edit-columns-dialog__preferences-grid">
          <Form.Item label={displayText(chrome.freeze_column)} className="field">
            <Select
              value={freezeColumn || undefined}
              allowClear
              placeholder={displayText(chrome.freeze_column_none)}
              options={selectedOrder.map((field) => ({
                value: field,
                label: labelByField.get(field) ?? field,
              }))}
              onChange={(value) => setFreezeColumn(value ?? "")}
            />
          </Form.Item>
          <Radio.Group
            className="edit-columns-dialog__radio"
            value={cellTextMode}
            onChange={(e) => setCellTextMode(e.target.value as "truncate" | "wrap")}
            options={[
              { value: "truncate", label: displayText(chrome.cell_text_truncate) },
              { value: "wrap", label: displayText(chrome.cell_text_wrap) },
            ]}
          />
        </div>
      </section>
    </Modal>
  );
}
