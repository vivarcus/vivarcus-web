import { describe, expect, it, vi } from "vitest";
import {
  ANCHOR_CREATED_MESSAGE,
  buildCreateAnchorUrl,
  isAnchorCreatedMessage,
  isCreateAnchorMode,
  publishAnchorCreated,
  subscribeAnchorCreated,
  truncateAnchorTitle,
} from "./annotateAnchorPicker";

describe("annotateAnchorPicker", () => {
  it("detects createAnchor query", () => {
    expect(isCreateAnchorMode("?createAnchor=1")).toBe(true);
    expect(isCreateAnchorMode("?createAnchor=0")).toBe(false);
    expect(isCreateAnchorMode("")).toBe(false);
  });

  it("builds create-anchor URL", () => {
    expect(buildCreateAnchorUrl("document__v", "V0001")).toBe(
      "/objects/document__v/records/V0001?createAnchor=1",
    );
  });

  it("validates postMessage payload", () => {
    expect(
      isAnchorCreatedMessage({
        type: ANCHOR_CREATED_MESSAGE,
        recordId: "r1",
        objectApiName: "document__v",
        anchor: { id: "a1", page: 2, title: "T", body: "" },
      }),
    ).toBe(true);
    expect(isAnchorCreatedMessage({ type: "other" })).toBe(false);
  });

  it("truncates anchor titles to 140 chars", () => {
    expect(truncateAnchorTitle("  hello  ")).toBe("hello");
    const long = "a".repeat(200);
    expect(truncateAnchorTitle(long)).toHaveLength(140);
  });

  it("publishes and subscribes via BroadcastChannel", async () => {
    const handler = vi.fn();
    const unsubscribe = subscribeAnchorCreated(handler);
    const payload = {
      type: ANCHOR_CREATED_MESSAGE,
      recordId: "r1",
      objectApiName: "document__v",
      anchor: { id: "a1", page: 1, title: "T", body: "b" },
    } as const;
    publishAnchorCreated(payload);
    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledWith(payload);
    });
    unsubscribe();
  });
});
