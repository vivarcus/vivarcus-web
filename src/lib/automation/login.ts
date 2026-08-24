import { commitInput, setNativeInputValue } from "./nativeValue";
import { waitUntil } from "./wait";

/** Same key as `auth/session.ts`. Kept local so the live inject bundle stays DOM-only. */
const SELECTED_VAULT_KEY = "vivarcus.selected_vault_id";

export type LoginOptions = {
  username: string;
  password: string;
  vaultId?: string;
};

export type LoginResult = {
  ok: boolean;
  reason?: string;
  step?: "username" | "password" | "vault";
};

function firstInput(selectors: string[]): HTMLInputElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

function usernameInput(): HTMLInputElement | null {
  return firstInput([
    'input[autocomplete="username"]',
    'input[name="username"]',
    'input[aria-label="User Name"]',
    'input[aria-label="用户名"]',
  ]);
}

function passwordInput(): HTMLInputElement | null {
  return firstInput([
    'input[autocomplete="current-password"]',
    'input[type="password"]',
    'input[name="password"]',
    'input[aria-label="Password"]',
    'input[aria-label="密码"]',
  ]);
}

function submitButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('button[type="submit"], button.auth-card__submit');
}

function fillControl(input: HTMLInputElement, value: string): void {
  input.focus();
  setNativeInputValue(input, value);
  commitInput(input);
}

export async function login(options: LoginOptions): Promise<LoginResult> {
  const username = options.username.trim();
  const password = options.password;
  if (!username || !password) {
    return { ok: false, reason: "username and password are required", step: "username" };
  }

  const user = usernameInput();
  const existingPassword = passwordInput();
  if (user && !existingPassword) {
    fillControl(user, username);
    submitButton()?.click();
  }

  const passwordReady = await waitUntil(() => passwordInput() !== null, 4_000);
  if (!passwordReady) {
    return { ok: false, reason: "password field not shown", step: "password" };
  }
  fillControl(passwordInput()!, password);
  submitButton()?.click();

  const vaultId = options.vaultId?.trim();
  if (!vaultId) {
    return { ok: true };
  }
  const leftLogin = await waitUntil(() => !window.location.pathname.includes("/login"), 8_000);
  if (!leftLogin) {
    return { ok: false, reason: "still on login page", step: "password" };
  }
  localStorage.setItem(SELECTED_VAULT_KEY, vaultId);
  location.reload();
  return { ok: true, step: "vault" };
}
