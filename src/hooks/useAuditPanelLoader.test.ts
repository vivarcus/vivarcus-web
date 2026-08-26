import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuditPanelLoader } from "./useAuditPanelLoader";

describe("useAuditPanelLoader", () => {
  it("does not stay loading when the panel is disabled", async () => {
    const fetchPanel = vi.fn();
    const { result } = renderHook(() =>
      useAuditPanelLoader({
        enabled: false,
        fetchPanel,
      }),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetchPanel).not.toHaveBeenCalled();
  });
});
