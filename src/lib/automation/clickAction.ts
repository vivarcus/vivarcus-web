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

function overflowTrigger(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      '.record-toolbar__overflow, .record-toolbar__menu-trigger, button[aria-label="All actions"], button[aria-label="全部操作"], button[title="All actions"], button[title="全部操作"]',
    ) ?? null
  );
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
  const overflow = overflowTrigger();
  if (!overflow) {
    return { ok: false, reason: `action not found: ${trimmed}` };
  }
  overflow.click();
  const found = await waitUntil(() => matchingControl(trimmed) !== null, 2_000);
  if (!found) {
    return { ok: false, reason: `action not found in All actions: ${trimmed}` };
  }
  matchingControl(trimmed)?.click();
  await sleep(30);
  return { ok: true };
}
