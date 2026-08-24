import { visibleText } from "./nativeValue";
import { sleep, waitUntil } from "./wait";

export type SaveRecordResult = {
  ok: boolean;
  reason?: string;
  banner?: string;
};

function visibleError(): string | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    '[role="alert"], .ant-alert-error, .ant-form-item-explain-error, .ant-message-error',
  );
  for (const node of nodes) {
    const text = visibleText(node);
    if (text) {
      return text;
    }
  }
  return null;
}

function saveButton(): HTMLButtonElement | null {
  const scoped = document.querySelector<HTMLButtonElement>(
    ".page-header__actions button.ant-btn-primary, .record-page-header__actions button.ant-btn-primary",
  );
  if (scoped) {
    return scoped;
  }
  const submit = document.querySelector<HTMLButtonElement>(
    'button.ant-btn-primary[type="submit"], button.ant-btn-primary[form]',
  );
  if (submit) {
    return submit;
  }
  const buttons = document.querySelectorAll<HTMLButtonElement>("button.ant-btn-primary");
  return buttons.length > 0 ? buttons[buttons.length - 1]! : null;
}

export async function saveRecord(): Promise<SaveRecordResult> {
  const button = saveButton();
  if (!button) {
    return { ok: false, reason: "save button not found" };
  }
  if (button.disabled) {
    return { ok: false, reason: "save button disabled" };
  }
  button.click();
  await sleep(50);
  await waitUntil(() => visibleError() !== null || !button.disabled, 2_000);
  const banner = visibleError();
  if (banner) {
    return { ok: false, reason: banner, banner };
  }
  return { ok: true };
}
