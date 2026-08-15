import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { NavigationModel } from "../api/types";
import { NavigationProvider } from "../context/NavigationContext";
import { useTabLabel } from "./useTabLabel";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const sampleNav: NavigationModel = {
  model_type: "navigation",
  vault_id: "v1",
  display_context: { language: "en", locale: "en-US", timezone: "UTC" },
  ui_fingerprint: "fp",
  collections: [
    {
      api_name: "c1",
      label: label("Collection"),
      items: [
        {
          item_type: "tab",
          label: label("Studies"),
          tab: {
            api_name: "studies__c",
            label: label("Studies"),
            kind: "object",
            route: "/tabs/studies__c",
            object_api_name: "study__c",
          },
        },
      ],
    },
  ],
};

// Mock the data hook the real NavigationProvider calls, so we control the nav
// model (and can simulate "not loaded yet") without touching the API layer.
const navState = vi.hoisted(() => ({ nav: null as NavigationModel | null }));
vi.mock("../hooks/useNavigation", () => ({
  useNavigation: () => ({ nav: navState.nav, error: null, refetch: () => {} }),
}));
navState.nav = sampleNav;

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavigationProvider vaultId="v1">{children}</NavigationProvider>
);

describe("useTabLabel", () => {
  it("prefers the navigation-state label over the nav model", () => {
    const { result } = renderHook(() => useTabLabel("studies__c", "Pinned Studies"), {
      wrapper,
    });
    expect(result.current).toBe("Pinned Studies");
  });

  it("resolves the display label from the nav model on a deep link", () => {
    const { result } = renderHook(() => useTabLabel("studies__c", undefined), {
      wrapper,
    });
    expect(result.current).toBe("Studies");
  });

  it("falls back to the tab API name when the tab is not in nav", () => {
    const { result } = renderHook(() => useTabLabel("unknown__c", undefined), {
      wrapper,
    });
    expect(result.current).toBe("unknown__c");
  });

  it("falls back to the tab API name while nav has not loaded", () => {
    navState.nav = null;
    try {
      const { result } = renderHook(() => useTabLabel("studies__c", undefined), {
        wrapper,
      });
      expect(result.current).toBe("studies__c");
    } finally {
      navState.nav = sampleNav;
    }
  });
});
