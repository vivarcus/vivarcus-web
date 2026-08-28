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

  it("retries while the first fetch returns no object rows", async () => {
    const fetchPanel = vi
      .fn()
      .mockResolvedValueOnce({ object_rows: [] })
      .mockResolvedValueOnce({ object_rows: [{ action: "Create", event_description: "Item created" }] });
    const { result } = renderHook(() =>
      useAuditPanelLoader({
        fetchPanel,
        retryWhenEmpty: (panel) => (panel.object_rows?.length ?? 0) === 0,
        retryIntervalMs: 20,
        maxEmptyRetries: 3,
      }),
    );
    await waitFor(() => {
      expect(fetchPanel).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetchPanel).toHaveBeenCalledTimes(2);
      expect(result.current.panel?.object_rows).toHaveLength(1);
    });
  });

  it("retries while login audit returns no rows", async () => {
    const fetchPanel = vi
      .fn()
      .mockResolvedValueOnce({ login_rows: [] })
      .mockResolvedValueOnce({ login_rows: [{ type: "User Login", status: "Success" }] });
    const { result } = renderHook(() =>
      useAuditPanelLoader({
        fetchPanel,
        retryWhenEmpty: (panel) => (panel.login_rows?.length ?? 0) === 0,
        retryIntervalMs: 20,
        maxEmptyRetries: 3,
      }),
    );
    await waitFor(() => {
      expect(fetchPanel).toHaveBeenCalledTimes(2);
      expect(result.current.panel?.login_rows).toHaveLength(1);
    });
  });
});
