const MAX_ATTEMPTS = 5;
const DROPDOWN_WAIT_MS = 300;
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

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
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

export function findFieldByApiName(fieldApiName: string): HTMLElement | null {
  const escaped = typeof CSS !== "undefined" && "escape" in CSS ? CSS.escape(fieldApiName) : fieldApiName;
  return document.querySelector<HTMLElement>(`[data-field-api-name="${escaped}"]`);
}

export function findFieldByLabel(fieldLabel: string): HTMLElement | null {
  const pattern = fieldLabelPattern(fieldLabel);
  const items = document.querySelectorAll<HTMLElement>(".field-grid__item");
  for (const item of items) {
    const dt = item.querySelector("dt");
    const text = dt?.textContent?.trim() ?? "";
    if (pattern.test(text)) {
      return item;
    }
  }
  return null;
}

function getCombobox(item: HTMLElement): HTMLElement | null {
  return item.querySelector<HTMLElement>('[role="combobox"]');
}

export function getPicklistSelection(item: HTMLElement): string | null {
  const selected = item.querySelector(".ant-select-selection-item, .ant-select-content");
  const text = selected?.textContent?.trim() ?? "";
  return text || null;
}

function isOptionSelected(item: HTMLElement, optionLabel: string): boolean {
  const pattern = new RegExp(`^${escapeRegex(optionLabel)}$`);
  const selected = item.querySelectorAll(".ant-select-selection-item, .ant-select-content");
  for (const el of selected) {
    const text = el.textContent?.trim() ?? "";
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

export function clickSelectOption(optionLabel: string): boolean {
  const optionPattern = new RegExp(`^\\s*${escapeRegex(optionLabel)}\\s*$`);
  const roots: ParentNode[] = [];
  const dropdown = activeSelectDropdown();
  if (dropdown) {
    roots.push(dropdown);
  }
  const listboxes = document.querySelectorAll('[role="listbox"]');
  if (listboxes.length > 0) {
    roots.push(listboxes[listboxes.length - 1]!);
  }

  for (const root of roots) {
    const options = root.querySelectorAll<HTMLElement>(".ant-select-item-option, [role='option']");
    for (const option of options) {
      const text = option.textContent?.trim() ?? "";
      const ariaLabel = option.getAttribute("aria-label")?.trim() ?? "";
      if (optionPattern.test(text) || text === optionLabel || optionPattern.test(ariaLabel)) {
        option.scrollIntoView?.({ block: "nearest" });
        option.click();
        return true;
      }
    }
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
    searchInput.value = optionLabel;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const antInput = item.querySelector<HTMLInputElement>("input.ant-select-input");
  if (antInput && isVisible(antInput) && !antInput.readOnly) {
    antInput.focus();
    antInput.value = optionLabel;
    antInput.dispatchEvent(new Event("input", { bubbles: true }));
    antInput.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  combobox.focus();
  for (const char of optionLabel) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
  }
}

function closeDropdown(): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    combobox.click();
    await sleep(DROPDOWN_WAIT_MS);

    if (clickSelectOption(optionLabel)) {
      await sleep(100);
      if (isOptionSelected(item, optionLabel)) {
        return { ok: true };
      }
    }

    await typeIntoSelectSearch(item, combobox, optionLabel);
    await sleep(200);

    if (clickSelectOption(optionLabel)) {
      await sleep(100);
      if (isOptionSelected(item, optionLabel)) {
        return { ok: true };
      }
    }

    closeDropdown();
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
    const rawLabel = item.querySelector("dt")?.textContent?.trim() ?? fieldApiName;
    const label = rawLabel.replace(/\*$/, "").trim();
    out.push({
      fieldApiName,
      label,
      selected: getPicklistSelection(item),
    });
  }
  return out;
}
