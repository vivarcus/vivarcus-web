/** Vault AI Chat surface modes (spec: Full / Panel / Float). */
export type VaultAIChatView = "full" | "panel" | "float";

export type VaultAIChatFloatRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** @deprecated Use VaultAIChatFloatRect — kept for older localStorage payloads. */
export type VaultAIChatFloatPos = { x: number; y: number; width?: number; height?: number };

export type VaultAIChatViewPrefs = {
  view: VaultAIChatView;
  float?: VaultAIChatFloatRect;
};

export const VAULT_AI_CHAT_VIEW_STORAGE_KEY = "vivarcus.vault_ai.chat_view.v2";

/** Spec default when the user has never chosen a view. */
export const VAULT_AI_CHAT_VIEW_DEFAULT: VaultAIChatView = "full";

export const VAULT_AI_CHAT_FLOAT_MIN_WIDTH = 320;
export const VAULT_AI_CHAT_FLOAT_MIN_HEIGHT = 320;

/** Matches docked Panel / app header offset used by the Drawer. */
export const VAULT_AI_CHAT_PANEL_WIDTH = 420;
export const VAULT_AI_CHAT_HEADER_OFFSET = 52;

export const VAULT_AI_CHAT_DOCKED_CLASS = "vault-ai-chat-docked";
export const VAULT_AI_CHAT_DOCK_WIDTH_VAR = "--vault-ai-chat-dock-width";

function isChatView(value: unknown): value is VaultAIChatView {
  return value === "full" || value === "panel" || value === "float";
}

/** Default Float matches docked Panel: right rail, below header, same width/height. */
export function defaultFloatRect(
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): VaultAIChatFloatRect {
  const width = Math.min(VAULT_AI_CHAT_PANEL_WIDTH, Math.max(VAULT_AI_CHAT_FLOAT_MIN_WIDTH, viewportWidth));
  const height = Math.max(VAULT_AI_CHAT_FLOAT_MIN_HEIGHT, viewportHeight - VAULT_AI_CHAT_HEADER_OFFSET);
  return {
    x: Math.max(0, viewportWidth - width),
    y: Math.min(VAULT_AI_CHAT_HEADER_OFFSET, Math.max(0, viewportHeight - height)),
    width,
    height,
  };
}

/** @deprecated Prefer defaultFloatRect. */
export function defaultFloatPos(
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
): VaultAIChatFloatRect {
  return defaultFloatRect(width, height);
}

export function clampFloatRect(
  rect: VaultAIChatFloatPos,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): VaultAIChatFloatRect {
  const fallback = defaultFloatRect(viewportWidth, viewportHeight);
  const maxWidth = Math.max(VAULT_AI_CHAT_FLOAT_MIN_WIDTH, viewportWidth);
  const width = Math.min(
    maxWidth,
    Math.max(
      VAULT_AI_CHAT_FLOAT_MIN_WIDTH,
      typeof rect.width === "number" ? rect.width : fallback.width,
    ),
  );
  const height = Math.min(
    Math.max(VAULT_AI_CHAT_FLOAT_MIN_HEIGHT, viewportHeight - 8),
    Math.max(
      VAULT_AI_CHAT_FLOAT_MIN_HEIGHT,
      typeof rect.height === "number" ? rect.height : fallback.height,
    ),
  );
  const maxX = Math.max(0, viewportWidth - Math.min(width, 80));
  const maxY = Math.max(0, viewportHeight - Math.min(height, 80));
  return {
    x: Math.min(Math.max(0, rect.x), maxX),
    y: Math.min(Math.max(0, rect.y), maxY),
    width,
    height,
  };
}

/** @deprecated Prefer clampFloatRect. */
export function clampFloatPos(
  pos: VaultAIChatFloatPos,
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
): VaultAIChatFloatRect {
  return clampFloatRect(pos, width, height);
}

function parseFloatRect(value: unknown): VaultAIChatFloatRect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.x !== "number" || typeof raw.y !== "number") return undefined;
  return clampFloatRect({
    x: raw.x,
    y: raw.y,
    width: typeof raw.width === "number" ? raw.width : undefined,
    height: typeof raw.height === "number" ? raw.height : undefined,
  });
}

export function loadVaultAIChatViewPrefs(): VaultAIChatViewPrefs {
  try {
    const raw = localStorage.getItem(VAULT_AI_CHAT_VIEW_STORAGE_KEY);
    if (!raw) return { view: VAULT_AI_CHAT_VIEW_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<VaultAIChatViewPrefs>;
    const view = isChatView(parsed.view) ? parsed.view : VAULT_AI_CHAT_VIEW_DEFAULT;
    return { view, float: parseFloatRect(parsed.float) };
  } catch {
    return { view: VAULT_AI_CHAT_VIEW_DEFAULT };
  }
}

export function saveVaultAIChatViewPrefs(prefs: VaultAIChatViewPrefs): void {
  try {
    const payload: VaultAIChatViewPrefs = {
      view: isChatView(prefs.view) ? prefs.view : VAULT_AI_CHAT_VIEW_DEFAULT,
    };
    if (prefs.float) {
      payload.float = clampFloatRect(prefs.float);
    }
    localStorage.setItem(VAULT_AI_CHAT_VIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export type VaultAIChatFloatResizeEdge = "e" | "s" | "se";

export function resizeFloatRect(
  start: VaultAIChatFloatRect,
  edge: VaultAIChatFloatResizeEdge,
  clientX: number,
  clientY: number,
  originX: number,
  originY: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): VaultAIChatFloatRect {
  const dx = clientX - originX;
  const dy = clientY - originY;
  let { x, y, width, height } = start;
  if (edge === "e" || edge === "se") {
    width = start.width + dx;
  }
  if (edge === "s" || edge === "se") {
    height = start.height + dy;
  }
  return clampFloatRect({ x, y, width, height }, viewportWidth, viewportHeight);
}
