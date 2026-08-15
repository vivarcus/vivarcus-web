import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ObjectListModel } from "../api/types";
import { useObjectListState } from "./useObjectListState";

function listModel(overrides: Partial<ObjectListModel> = {}): ObjectListModel {
  return {
    model_type: "object_list",
    vault_id: "v1",
    display_context: {},
    tab_api_name: "artifacts__v",
    tab_label: { text: "Artifacts", key: "tab.artifacts" },
    object_api_name: "artifact__v",
    selected_view: "all",
    views: [{ id: "all", label: { text: "All", key: "view.all" } }],
    columns: [],
    records: [{ record_id: "1", fields: {} }],
    pagination: { page_size: 20, size: 1, total: 1 },
    actions: { allowed: true },
    chrome: {} as ObjectListModel["chrome"],
    schema_fingerprint: "s",
    ui_fingerprint: "u",
    list_context_fingerprint: "fp",
    ...overrides,
  };
}

describe("useObjectListState", () => {
  it("does not refetch when the server echoes selected_view without pinning", async () => {
    const fetchList = vi.fn(async () => listModel({ selected_view: "all" }));

    const { result } = renderHook(() =>
      useObjectListState({
        scopeKey: "artifacts__v",
        vaultId: "v1",
        fetchList,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchList).toHaveBeenCalledTimes(1);
    expect(fetchList.mock.calls[0]?.[0]).toMatchObject({
      view: undefined,
      pageSize: 20,
    });
    expect(result.current.model?.selected_view).toBe("all");

    // Allow any mistaken view-echo effect to flush.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchList).toHaveBeenCalledTimes(1);
  });

  it("refetches once when the user pins a different view", async () => {
    const fetchList = vi.fn(async (query: { view?: string }) =>
      listModel({ selected_view: query.view ?? "all" }),
    );

    const { result } = renderHook(() =>
      useObjectListState({
        scopeKey: "artifacts__v",
        vaultId: "v1",
        fetchList,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchList).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.selectView("recent");
    });

    await waitFor(() => expect(fetchList).toHaveBeenCalledTimes(2));
    expect(fetchList.mock.calls[1]?.[0]).toMatchObject({ view: "recent" });
  });
});
