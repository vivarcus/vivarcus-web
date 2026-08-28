import { describe, expect, it } from "vitest";
import { isStartNextPrompt } from "./startNextWorkflow";

describe("isStartNextPrompt", () => {
  it("requires at least one action", () => {
    expect(isStartNextPrompt(null)).toBe(false);
    expect(isStartNextPrompt({ actions: [] })).toBe(false);
    expect(isStartNextPrompt({ workflow_label: "Review", actions: [{ name: "start_wf", label: "Next" }] })).toBe(
      true,
    );
  });
});
