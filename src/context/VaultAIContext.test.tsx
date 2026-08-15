import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VaultAIProvider, useVaultAI, type VaultAIPageNavigator } from "./VaultAIContext";

function wrapper({ children }: { children: ReactNode }) {
  return <VaultAIProvider>{children}</VaultAIProvider>;
}

describe("VaultAIContext pageNavigator", () => {
  it("stores a navigator function instead of treating it as a useState updater", () => {
    const { result } = renderHook(() => useVaultAI(), { wrapper });
    const navigator = vi.fn<VaultAIPageNavigator>();

    act(() => {
      result.current.setPageNavigator(navigator);
    });

    expect(result.current.pageNavigator).toBe(navigator);

    act(() => {
      result.current.pageNavigator?.(3, "dose");
    });
    expect(navigator).toHaveBeenCalledWith(3, "dose");

    act(() => {
      result.current.setPageNavigator(null);
    });
    expect(result.current.pageNavigator).toBeNull();
  });
});
