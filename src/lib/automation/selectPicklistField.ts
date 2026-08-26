import { setNativeInputValue } from "./nativeValue";

const MAX_ATTEMPTS = 5;
const DROPDOWN_WAIT_MS = 3_000;
const POLL_INTERVAL_MS = 20;
const RETRY_GAP_MS = 300;

export type SelectPicklistFieldResult = {
  ok: boolean;
  reason?: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return true;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return predicate();
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function openSelectCombobox(combobox: HTMLElement): void {
  combobox.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  combobox.click();
}

export function fieldLabelPattern(label: string): RegExp {
  const escaped = escapeRegex(label);
  return new RegExp(`^${escaped}(\\*)?$`);
}

export function activeSelectDropdown(): HTMLElement | null {
  const dropdowns = document.querySelectorAll<HTMLElement>(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
  );
  return dropdowns.length > 0 ? dropdowns[dropdowns.length - 1]! : null;
}

/** Resolve the open dropdown owned by this combobox (aria-controls), not a leftover sibling Select. */
export function dropdownForCombobox(combobox: HTMLElement): HTMLElement | null {
  const listId = combobox.getAttribute("aria-controls") || combobox.getAttribute("aria-owns");
  if (listId) {
    const list = document.getElementById(listId);
    const owned = list?.closest<HTMLElement>(".ant-select-dropdown");
    if (owned && !owned.classList.contains("ant-select-dropdown-hidden")) {
      return owned;
    }
  }
  return activeSelectDropdown();
}

export function fieldLabelText(item: HTMLElement, fallback = ""): string {
  const dt = item.querySelector("dt");
  if (dt) {
    return (dt.textContent?.trim() ?? fallback).replace(/\*$/, "").trim();
  }
  const formLabel = item.querySelector<HTMLElement>(
    ".ant-form-item-label span, .ant-form-item-label label",
  );
  if (formLabel) {
    return (formLabel.textContent?.trim() ?? fallback).replace(/\*$/, "").trim();
  }
  return fallback.replace(/\*$/, "").trim();
}

function modalFieldRoots(): HTMLElement[] {
  const roots: HTMLElement[] = [];
  const workflow = document.querySelector<HTMLElement>(".workflow-start-modal");
  if (workflow) {
    roots.push(workflow);
  }
  for (const modal of document.querySelectorAll<HTMLElement>(".ant-modal:not(.ant-modal-hidden)")) {
    roots.push(modal);
  }
  const dialog = document.querySelector<HTMLElement>("[role=dialog]");
  if (dialog && !roots.includes(dialog)) {
    roots.push(dialog);
  }
  return roots;
}

export function findFieldByApiName(fieldApiName: string): HTMLElement | null {
  const escaped = typeof CSS !== "undefined" && "escape" in CSS ? CSS.escape(fieldApiName) : fieldApiName;
  const selector = `[data-field-api-name="${escaped}"]`;
  for (const root of modalFieldRoots()) {
    const scoped = root.querySelector<HTMLElement>(selector);
    if (scoped) {
      return scoped;
    }
  }
  return document.querySelector<HTMLElement>(selector);
}

export function findFieldByLabel(fieldLabel: string): HTMLElement | null {
  const pattern = fieldLabelPattern(fieldLabel);
  for (const root of modalFieldRoots()) {
    const found = findFieldByLabelInRoot(root, pattern);
    if (found) {
      return found;
    }
  }
  return findFieldByLabelInRoot(document, pattern);
}

function findFieldByLabelInRoot(root: ParentNode, pattern: RegExp): HTMLElement | null {
  const items = root.querySelectorAll<HTMLElement>(".field-grid__item, .workflow-start-control");
  for (const item of items) {
    const nodes = item.querySelectorAll("dt, .ant-form-item-label span, .ant-form-item-label label");
    for (const node of nodes) {
      const text = (node.textContent?.trim() ?? "").replace(/\*$/, "").trim();
      if (pattern.test(text) || pattern.test(node.textContent?.trim() ?? "")) {
        return item;
      }
    }
  }
  return null;
}

function getCombobox(item: HTMLElement): HTMLElement | null {
  return item.querySelector<HTMLElement>('[role="combobox"]');
}

function selectedItemLabels(item: HTMLElement): string[] {
  const contents = item.querySelectorAll(".ant-select-selection-item-content");
  if (contents.length > 0) {
    return [...contents].map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
  }
  const selected = item.querySelectorAll(".ant-select-selection-item");
  if (selected.length > 0) {
    return [...selected]
      .map((el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".ant-select-selection-item-remove").forEach((node) => node.remove());
        return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);
  }
  const combo = getCombobox(item);
  if (combo) {
    const titled = item.querySelector<HTMLElement>("[title]");
    const title = titled?.getAttribute("title")?.trim();
    if (title && title !== combo.getAttribute("aria-label")) {
      return [title];
    }
    const labels: string[] = [];
    for (const el of item.querySelectorAll<HTMLElement>(".ant-select, .ant-select-selector, [class*='selection']")) {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text && !/请选择/.test(text) && text !== (combo.getAttribute("aria-label") ?? "")) {
        labels.push(text);
      }
    }
    if (labels.length > 0) {
      return [...new Set(labels)];
    }
  }
  return [];
}

export function getPicklistSelection(item: HTMLElement): string | null {
  return selectedItemLabels(item)[0] ?? null;
}

function isOptionSelected(item: HTMLElement, optionLabel: string): boolean {
  const pattern = new RegExp(`^${escapeRegex(optionLabel)}$`);
  return selectedItemLabels(item).some((text) => pattern.test(text));
}

export function clickSelectOption(optionLabel: string, combobox?: HTMLElement): boolean {
  const optionPattern = new RegExp(`^\\s*${escapeRegex(optionLabel)}\\s*$`);
  // Prefer the dropdown owned by this combobox. A leftover sibling Select (workflow
  // start has two participant pickers) is often the last visible dropdown; clicking
  // its already-selected option would deselect that field.
  const dropdown = combobox ? dropdownForCombobox(combobox) : activeSelectDropdown();
  if (!dropdown) {
    return false;
  }
  const options = dropdown.querySelectorAll<HTMLElement>(".ant-select-item-option");
  for (const option of options) {
    const text = option.textContent?.trim() ?? "";
    const ariaLabel = option.getAttribute("aria-label")?.trim() ?? "";
    if (!(optionPattern.test(text) || text === optionLabel || optionPattern.test(ariaLabel))) {
      continue;
    }
    if (option.classList.contains("ant-select-item-option-selected")) {
      // Clicking a selected multiple-select option deselects it. If this is a
      // leftover sibling dropdown, keep looking; the owned dropdown is next.
      continue;
    }
    option.scrollIntoView?.({ block: "nearest" });
    option.click();
    return true;
  }
  return false;
}

async function typeIntoSelectSearch(
  item: HTMLElement,
  combobox: HTMLElement,
  optionLabel: string,
): Promise<void> {
  const searchInput = item.querySelector<HTMLInputElement>("input.ant-select-selection-search-input");
  if (searchInput && isVisible(searchInput)) {
    searchInput.focus();
    setNativeInputValue(searchInput, optionLabel);
    return;
  }

  const antInput = item.querySelector<HTMLInputElement>("input.ant-select-input");
  if (antInput && isVisible(antInput) && !antInput.readOnly) {
    antInput.focus();
    setNativeInputValue(antInput, optionLabel);
    return;
  }

  combobox.focus();
  for (const char of optionLabel) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
  }
}

function dismissSelectDropdown(): void {
  // Escape would also close the workflow-start Modal. rc-select closes on
  // window mousedown outside the selector + popup.
  const sink =
    document.querySelector<HTMLElement>(
      ".workflow-start-modal .ant-modal-title, .workflow-start-modal .workflow-start-instructions, .workflow-start-modal",
    ) ?? document.body;
  sink.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
}

/** DOM-driven picklist selection — mirrors web/acceptance/clinical-operations/record-form.ts. */
export async function selectPicklistField(
  item: HTMLElement,
  optionLabel: string,
): Promise<SelectPicklistFieldResult> {
  const combobox = getCombobox(item);
  if (!combobox) {
    return { ok: false, reason: "combobox not found" };
  }

  if (isOptionSelected(item, optionLabel)) {
    return { ok: true };
  }

  const tryClick = () => clickSelectOption(optionLabel, combobox);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (activeSelectDropdown() && !dropdownForCombobox(combobox)) {
      dismissSelectDropdown();
      await waitUntil(() => activeSelectDropdown() === null, 500);
    }
    // Cold Ant Design Select portals can take >300ms to mount options; poll instead of a fixed sleep.
    openSelectCombobox(combobox);
    if (await waitUntil(tryClick, DROPDOWN_WAIT_MS)) {
      if (await waitUntil(() => isOptionSelected(item, optionLabel), 500)) {
        dismissSelectDropdown();
        await waitUntil(() => dropdownForCombobox(combobox) === null, 500);
        if (isOptionSelected(item, optionLabel)) {
          return { ok: true };
        }
      }
    }

    await typeIntoSelectSearch(item, combobox, optionLabel);
    // Remote-search participant pickers (workflow start) need the member-options
    // round-trip after typing; reuse the same poll budget as a cold dropdown.
    if (await waitUntil(tryClick, DROPDOWN_WAIT_MS)) {
      if (await waitUntil(() => isOptionSelected(item, optionLabel), 500)) {
        dismissSelectDropdown();
        await waitUntil(() => dropdownForCombobox(combobox) === null, 500);
        if (isOptionSelected(item, optionLabel)) {
          return { ok: true };
        }
      }
    }

    dismissSelectDropdown();
    await sleep(RETRY_GAP_MS);
  }

  return { ok: false, reason: `could not select ${optionLabel}` };
}

export type FormPicklistFieldInfo = {
  fieldApiName: string;
  label: string;
  selected: string | null;
};

export function listFormPicklistFields(): FormPicklistFieldInfo[] {
  const out: FormPicklistFieldInfo[] = [];
  const items = document.querySelectorAll<HTMLElement>("[data-field-api-name]");
  for (const item of items) {
    if (!getCombobox(item)) {
      continue;
    }
    const fieldApiName = item.getAttribute("data-field-api-name")?.trim() ?? "";
    if (!fieldApiName) {
      continue;
    }
    const label = fieldLabelText(item, fieldApiName);
    out.push({
      fieldApiName,
      label,
      selected: getPicklistSelection(item),
    });
  }
  return out;
}
