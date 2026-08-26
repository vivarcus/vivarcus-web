import { visibleText } from "./nativeValue";
import { sleep, waitUntil } from "./wait";

export type ClickActionResult = {
  ok: boolean;
  reason?: string;
};

function labelPattern(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escaped}\\s*$`, "i");
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function matchingControl(label: string): HTMLElement | null {
  const pattern = labelPattern(label);
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, a, [role="menuitem"], [role="button"], .ant-dropdown-menu-title-content, .ant-menu-title-content',
  );
  for (const el of candidates) {
    if (!isVisible(el)) {
      continue;
    }
    const text = visibleText(el);
    const aria = el.getAttribute("aria-label")?.trim() ?? "";
    const title = el.getAttribute("title")?.trim() ?? "";
    if (pattern.test(text) || pattern.test(aria) || pattern.test(title)) {
      return el;
    }
  }
  return null;
}

function firstMatching(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

function workflowMenuTrigger(): HTMLElement | null {
  return firstMatching([
    ".record-toolbar__workflow-state",
    'button[aria-label="Workflow and State Change"]',
    'button[aria-label="工作流和状态更改"]',
    'button[title="Workflow and State Change"]',
    'button[title="工作流和状态更改"]',
  ]);
}

function allActionsTrigger(): HTMLElement | null {
  return firstMatching([
    ".record-toolbar__overflow",
    ".record-toolbar__menu-trigger",
    'button[aria-label="All actions"]',
    'button[aria-label="所有操作"]',
    'button[aria-label="全部操作"]',
    'button[title="All actions"]',
    'button[title="所有操作"]',
    'button[title="全部操作"]',
  ]);
}

function closeOpenMenus(): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

async function clickInMenu(trigger: HTMLElement, label: string): Promise<boolean> {
  closeOpenMenus();
  await sleep(30);
  trigger.click();
  const found = await waitUntil(() => matchingControl(label) !== null, 2_000);
  if (!found) {
    closeOpenMenus();
    return false;
  }
  matchingControl(label)?.click();
  await sleep(30);
  return true;
}

export async function clickAction(label: string): Promise<ClickActionResult> {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, reason: "label is required" };
  }
  const direct = matchingControl(trimmed);
  if (direct) {
    direct.click();
    return { ok: true };
  }

  const workflow = workflowMenuTrigger();
  if (workflow && (await clickInMenu(workflow, trimmed))) {
    return { ok: true };
  }

  const overflow = allActionsTrigger();
  if (overflow && (await clickInMenu(overflow, trimmed))) {
    return { ok: true };
  }

  if (!workflow && !overflow) {
    return { ok: false, reason: `action not found: ${trimmed}` };
  }
  return { ok: false, reason: `action not found in Workflow or All actions: ${trimmed}` };
}
