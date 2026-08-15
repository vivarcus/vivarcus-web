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

  it("hands a pending Chat conversation id to the panel once", () => {
    const { result } = renderHook(() => useVaultAI(), { wrapper });

    act(() => {
      result.current.requestOpenChatConversation("conv-1");
    });
    expect(result.current.pendingChatConversationId).toBe("conv-1");

    let taken: string | null = null;
    act(() => {
      taken = result.current.takePendingChatConversationId();
    });
    expect(taken).toBe("conv-1");
    expect(result.current.pendingChatConversationId).toBeNull();
    expect(result.current.takePendingChatConversationId()).toBeNull();
  });
});
