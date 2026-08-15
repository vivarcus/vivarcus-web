import { describe, expect, it } from "vitest";
import { ancestorArtifactIds } from "./useTmfViewerPrefs";

describe("ancestorArtifactIds", () => {
  it("returns parent chain for a nested artifact", () => {
    const nodes = [
      { id: "zone", parent_id: undefined },
      { id: "section", parent_id: "zone" },
      { id: "leaf", parent_id: "section" },
    ];
    expect(ancestorArtifactIds(nodes, "leaf")).toEqual(["section", "zone"]);
  });

  it("returns empty list when artifact is missing", () => {
    expect(ancestorArtifactIds([], "leaf")).toEqual([]);
  });
});
