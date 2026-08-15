import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  TabListActionsProvider,
  useTabListActionsPublisher,
} from "../context/TabListActionsContext";
import { useTabListActions, type TabListActions } from "./useTabListActions";

const sample: TabListActions = {
  allowed: true,
  requiresTypeSelection: false,
  objectTypes: [],
  objectApiName: "artifact__v",
};

function wrapper({ children }: { children: ReactNode }) {
  return <TabListActionsProvider>{children}</TabListActionsProvider>;
}

describe("useTabListActions", () => {
  it("returns empty until ObjectListPage publishes matching tab actions", () => {
    const { result } = renderHook(
      () => ({
        publisher: useTabListActionsPublisher(),
        actions: useTabListActions("v1", "artifacts__v", true),
      }),
      { wrapper },
    );

    expect(result.current.actions).toEqual({
      allowed: false,
      requiresTypeSelection: false,
      objectTypes: [],
    });

    act(() => {
      result.current.publisher.publish("artifacts__v", sample);
    });

    expect(result.current.actions).toEqual(sample);
  });

  it("ignores published actions for a different tab", () => {
    const { result } = renderHook(
      () => ({
        publisher: useTabListActionsPublisher(),
        actions: useTabListActions("v1", "studies__v", true),
      }),
      { wrapper },
    );

    act(() => {
      result.current.publisher.publish("artifacts__v", sample);
    });

    expect(result.current.actions.allowed).toBe(false);
  });

  it("keeps publisher identity stable across publish so list effects cannot loop", () => {
    const { result } = renderHook(() => useTabListActionsPublisher(), { wrapper });
    const first = result.current;

    act(() => {
      result.current.publish("artifacts__v", sample);
    });

    expect(result.current).toBe(first);
    expect(result.current.publish).toBe(first.publish);
    expect(result.current.clear).toBe(first.clear);
  });
});
