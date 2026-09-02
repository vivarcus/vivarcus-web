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

function collapseWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeFieldLabel(text: string): string {
  return collapseWs(text).replace(/\*$/, "").trim();
}

function stripPluralMarker(text: string): string {
  return text.replace(/\(s\)$/i, "").trim();
}

export function fieldLabelsMatch(candidate: string, wanted: string): boolean {
  const a = normalizeFieldLabel(candidate);
  const b = normalizeFieldLabel(wanted);
  if (!a || !b) {
    return false;
  }
  if (a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0) {
    return true;
  }
  return (
    stripPluralMarker(a).localeCompare(stripPluralMarker(b), undefined, { sensitivity: "accent" }) === 0
  );
}

export function fieldLabelPattern(label: string): RegExp {
  const escaped = escapeRegex(label);
  return new RegExp(`^${escaped}(\\*)?$`, "i");
}

function localPart(value: string): string {
  const trimmed = collapseWs(value);
  const at = trimmed.indexOf("@");
  return (at > 0 ? trimmed.slice(0, at) : trimmed).toLowerCase();
}

/** Exact label match, plus username local-part / "qa.lead" → "qa.lead User" for participant pickers. */
export function optionLabelsMatch(candidate: string, wanted: string, looseUserMatch = false): boolean {
  const a = collapseWs(candidate);
  const b = collapseWs(wanted);
  if (!a || !b) {
    return false;
  }
  if (a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0) {
    return true;
  }
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) {
    return true;
  }
  if (!looseUserMatch) {
    return false;
  }
  if (al.startsWith(`${bl} `) || bl.startsWith(`${al} `)) {
    return true;
  }
  const aLocal = localPart(a);
  const bLocal = localPart(b);
  if (aLocal && aLocal === bLocal) {
    return true;
  }
  return al.startsWith(`${bLocal} `) || bl.startsWith(`${aLocal} `);
}

function isWorkflowParticipantItem(item: HTMLElement): boolean {
  return (
    item.classList.contains("workflow-start-control") ||
    item.closest(".workflow-start-modal, .workflow-start-form") !== null
  );
}

export function activeSelectDropdown(): HTMLElement | null {
  const dropdowns = document.querySelectorAll<HTMLElement>(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
  );
  return dropdowns.length > 0 ? dropdowns[dropdowns.length - 1]! : null;
}

/** Open dropdown bound to this combobox via aria-controls/owns. No leftover-sibling fallback. */
export function ownedDropdownForCombobox(combobox: HTMLElement): HTMLElement | null {
  const listId = combobox.getAttribute("aria-controls") || combobox.getAttribute("aria-owns");
  if (!listId || listId === "undefined_list") {
    return null;
  }
  const list = document.getElementById(listId);
  const owned = list?.closest<HTMLElement>(".ant-select-dropdown");
  if (owned && !owned.classList.contains("ant-select-dropdown-hidden")) {
    return owned;
  }
  return null;
}

/** Resolve the open dropdown owned by this combobox (aria-controls), not a leftover sibling Select. */
export function dropdownForCombobox(combobox: HTMLElement): HTMLElement | null {
  return ownedDropdownForCombobox(combobox) ?? activeSelectDropdown();
}

const LABEL_CHROME = /^(Assigned to every user|Available to any user|Assigned|Available|已分配|可用)$/i;

function labelNodeCandidates(item: HTMLElement): string[] {
  const out: string[] = [];
  const nodes = item.querySelectorAll("dt, .ant-form-item-label span, .ant-form-item-label label");
  for (const node of nodes) {
    const text = normalizeFieldLabel(node.textContent ?? "");
    if (!text || LABEL_CHROME.test(text)) {
      continue;
    }
    out.push(text);
  }
  return out;
}

export function fieldLabelText(item: HTMLElement, fallback = ""): string {
  const dt = item.querySelector("dt");
  if (dt) {
    return normalizeFieldLabel(dt.textContent ?? fallback);
  }
  const candidates = labelNodeCandidates(item);
  if (candidates.length === 0) {
    return normalizeFieldLabel(fallback);
  }
  // Innermost span is shortest; Form.Item + Space wrappers concatenate the assignment tag.
  return [...candidates].sort((a, b) => a.length - b.length)[0]!;
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
  for (const root of modalFieldRoots()) {
    const found = findFieldByLabelInRoot(root, fieldLabel);
    if (found) {
      return found;
    }
  }
  return findFieldByLabelInRoot(document, fieldLabel);
}

function findFieldByLabelInRoot(root: ParentNode, wanted: string): HTMLElement | null {
  const items = root.querySelectorAll<HTMLElement>(".field-grid__item, .workflow-start-control");
  for (const item of items) {
    const nodes = item.querySelectorAll("dt, .ant-form-item-label span, .ant-form-item-label label");
    for (const node of nodes) {
      const text = normalizeFieldLabel(node.textContent ?? "");
      if (fieldLabelsMatch(text, wanted) || fieldLabelPattern(wanted).test(node.textContent?.trim() ?? "")) {
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
    return [...contents].map((el) => collapseWs(el.textContent ?? "")).filter(Boolean);
  }
  const selected = item.querySelectorAll(".ant-select-selection-item");
  if (selected.length > 0) {
    return [...selected]
      .map((el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".ant-select-selection-item-remove, .ant-tag-close-icon").forEach((node) => {
          node.remove();
        });
        return collapseWs(clone.textContent ?? "");
      })
      .filter(Boolean);
  }
  // Custom tagRender (workflow participant Select) replaces selection-item with antd Tag.
  const tags = item.querySelectorAll(".ant-select .ant-tag");
  if (tags.length > 0) {
    return [...tags]
      .map((el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".ant-tag-close-icon, .anticon").forEach((node) => node.remove());
        return collapseWs(clone.textContent ?? "");
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
      const text = collapseWs(el.textContent ?? "");
      if (text && !/请选择|Select users/i.test(text) && text !== (combo.getAttribute("aria-label") ?? "")) {
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
  const loose = isWorkflowParticipantItem(item);
  return selectedItemLabels(item).some((text) => optionLabelsMatch(text, optionLabel, loose));
}

function optionNodeMatches(option: HTMLElement, optionLabel: string, looseUserMatch: boolean): boolean {
  const text = collapseWs(option.textContent ?? "");
  const ariaLabel = collapseWs(option.getAttribute("aria-label") ?? "");
  const title = collapseWs(option.getAttribute("title") ?? "");
  return (
    optionLabelsMatch(text, optionLabel, looseUserMatch) ||
    optionLabelsMatch(ariaLabel, optionLabel, looseUserMatch) ||
    optionLabelsMatch(title, optionLabel, looseUserMatch)
  );
}

export function clickSelectOption(optionLabel: string, combobox?: HTMLElement): boolean {
  const owned = combobox ? ownedDropdownForCombobox(combobox) : null;
  const dropdown = owned ?? (combobox ? dropdownForCombobox(combobox) : activeSelectDropdown());
  if (!dropdown) {
    return false;
  }
  const loose = Boolean(combobox?.closest(".workflow-start-control, .workflow-start-modal"));
  const options = dropdown.querySelectorAll<HTMLElement>(".ant-select-item-option");
  for (const option of options) {
    if (!optionNodeMatches(option, optionLabel, loose)) {
      continue;
    }
    if (option.classList.contains("ant-select-item-option-selected")) {
      // Owned dropdown: already selected — success. Leftover sibling: skip so we
      // do not toggle the first reviewer off.
      if (owned) {
        return true;
      }
      continue;
    }
    option.scrollIntoView?.({ block: "nearest" });
    option.click();
    return true;
  }
  return false;
}

function searchInputForItem(item: HTMLElement, combobox: HTMLElement): HTMLInputElement | null {
  if (combobox instanceof HTMLInputElement && !combobox.readOnly) {
    return combobox;
  }
  const selectors = [
    "input.ant-select-selection-search-input",
    "input.ant-select-input",
    'input[type="search"]',
    'input[role="combobox"]',
  ];
  for (const selector of selectors) {
    const input = item.querySelector<HTMLInputElement>(selector);
    if (input && isVisible(input) && !input.readOnly) {
      return input;
    }
  }
  return null;
}

async function typeIntoSelectSearch(
  item: HTMLElement,
  combobox: HTMLElement,
  optionLabel: string,
): Promise<void> {
  const searchInput = searchInputForItem(item, combobox);
  if (searchInput) {
    searchInput.focus();
    setNativeInputValue(searchInput, optionLabel);
    return;
  }

  combobox.focus();
  for (const char of optionLabel) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
  }
}

function ownedOptionIsSelected(combobox: HTMLElement, optionLabel: string): boolean {
  const dropdown = ownedDropdownForCombobox(combobox) ?? dropdownForCombobox(combobox);
  if (!dropdown) {
    return false;
  }
  const loose = Boolean(combobox.closest(".workflow-start-control, .workflow-start-modal"));
  for (const option of dropdown.querySelectorAll<HTMLElement>(".ant-select-item-option")) {
    if (
      optionNodeMatches(option, optionLabel, loose) &&
      option.classList.contains("ant-select-item-option-selected")
    ) {
      return true;
    }
  }
  return false;
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

  const selectedNow = () => isOptionSelected(item, optionLabel) || ownedOptionIsSelected(combobox, optionLabel);

  if (selectedNow()) {
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
      if (await waitUntil(selectedNow, 500)) {
        dismissSelectDropdown();
        await waitUntil(() => dropdownForCombobox(combobox) === null, 500);
        if (selectedNow()) {
          return { ok: true };
        }
      }
    }

    await typeIntoSelectSearch(item, combobox, optionLabel);
    // Remote-search participant pickers (workflow start) need the member-options
    // round-trip after typing; reuse the same poll budget as a cold dropdown.
    if (await waitUntil(tryClick, DROPDOWN_WAIT_MS)) {
      if (await waitUntil(selectedNow, 500)) {
        dismissSelectDropdown();
        await waitUntil(() => dropdownForCombobox(combobox) === null, 500);
        if (selectedNow()) {
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
