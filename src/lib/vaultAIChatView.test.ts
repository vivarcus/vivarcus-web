import { afterEach, describe, expect, it } from "vitest";
import {
  VAULT_AI_CHAT_FLOAT_MIN_HEIGHT,
  VAULT_AI_CHAT_FLOAT_MIN_WIDTH,
  VAULT_AI_CHAT_HEADER_OFFSET,
  VAULT_AI_CHAT_PANEL_WIDTH,
  VAULT_AI_CHAT_VIEW_DEFAULT,
  VAULT_AI_CHAT_VIEW_STORAGE_KEY,
  clampFloatRect,
  defaultFloatRect,
  loadVaultAIChatViewPrefs,
  resizeFloatRect,
  saveVaultAIChatViewPrefs,
} from "./vaultAIChatView";

describe("vaultAIChatView prefs", () => {
  afterEach(() => {
    localStorage.removeItem(VAULT_AI_CHAT_VIEW_STORAGE_KEY);
  });

  it("defaults to full per spec", () => {
    expect(loadVaultAIChatViewPrefs()).toEqual({ view: VAULT_AI_CHAT_VIEW_DEFAULT });
    expect(VAULT_AI_CHAT_VIEW_DEFAULT).toBe("full");
  });

  it("round-trips view and float rect including size", () => {
    saveVaultAIChatViewPrefs({
      view: "float",
      float: { x: 40, y: 80, width: 500, height: 640 },
    });
    expect(loadVaultAIChatViewPrefs()).toEqual({
      view: "float",
      float: { x: 40, y: 80, width: 500, height: 640 },
    });
  });

  it("fills panel-sized defaults when older prefs only stored position", () => {
    localStorage.setItem(
      VAULT_AI_CHAT_VIEW_STORAGE_KEY,
      JSON.stringify({ view: "float", float: { x: 40, y: 80 } }),
    );
    const loaded = loadVaultAIChatViewPrefs().float;
    expect(loaded?.x).toBe(40);
    expect(loaded?.y).toBe(80);
    expect(loaded?.width).toBe(VAULT_AI_CHAT_PANEL_WIDTH);
    expect(loaded?.height).toBeGreaterThanOrEqual(VAULT_AI_CHAT_FLOAT_MIN_HEIGHT);
  });

  it("ignores invalid stored view", () => {
    localStorage.setItem(VAULT_AI_CHAT_VIEW_STORAGE_KEY, JSON.stringify({ view: "nope" }));
    expect(loadVaultAIChatViewPrefs().view).toBe("full");
  });

  it("defaults float to the docked panel geometry", () => {
    expect(clampFloatRect({ x: -20, y: 9999, width: 100, height: 100 }, 800, 600)).toEqual({
      x: 0,
      y: 520,
      width: VAULT_AI_CHAT_FLOAT_MIN_WIDTH,
      height: VAULT_AI_CHAT_FLOAT_MIN_HEIGHT,
    });
    const def = defaultFloatRect(1400, 900);
    expect(def).toEqual({
      x: 1400 - VAULT_AI_CHAT_PANEL_WIDTH,
      y: VAULT_AI_CHAT_HEADER_OFFSET,
      width: VAULT_AI_CHAT_PANEL_WIDTH,
      height: 900 - VAULT_AI_CHAT_HEADER_OFFSET,
    });
  });

  it("resizes from the south-east handle", () => {
    const start = { x: 100, y: 100, width: 400, height: 500 };
    const next = resizeFloatRect(start, "se", 160, 180, 100, 100, 1400, 900);
    expect(next.width).toBe(460);
    expect(next.height).toBe(580);
  });
});
