import { describe, expect, it } from "vitest";
import {
  emptyListboxSelection,
  handleListboxClick,
  reorderSelectedBlock,
  reorderSelectedToEdge,
  selectedFieldsInOrder,
} from "./listboxSelection";

const items = ["a", "b", "c", "d", "e"];

describe("handleListboxClick", () => {
  it("selects a single item on plain click", () => {
    const next = handleListboxClick("b", items, { shiftKey: false, metaKey: false, ctrlKey: false }, emptyListboxSelection());
    expect([...next.selected]).toEqual(["b"]);
    expect(next.anchor).toBe("b");
  });

  it("toggles items with ctrl/meta click", () => {
    let state = handleListboxClick("a", items, { shiftKey: false, metaKey: false, ctrlKey: false }, emptyListboxSelection());
    state = handleListboxClick("c", items, { shiftKey: false, metaKey: false, ctrlKey: true }, state);
    expect([...state.selected]).toEqual(["a", "c"]);
  });

  it("selects a range with shift click", () => {
    const state = handleListboxClick(
      "b",
      items,
      { shiftKey: false, metaKey: false, ctrlKey: false },
      { selected: new Set(["b"]), anchor: "b" },
    );
    const next = handleListboxClick("d", items, { shiftKey: true, metaKey: false, ctrlKey: false }, state);
    expect([...next.selected]).toEqual(["b", "c", "d"]);
  });
});

describe("selectedFieldsInOrder", () => {
  it("returns selected fields in list order", () => {
    const selection = { selected: new Set(["c", "a"]), anchor: "c" };
    expect(selectedFieldsInOrder(selection, ["a", "b", "c", "d"])).toEqual(["a", "c"]);
  });
});

describe("reorderSelectedBlock", () => {
  it("moves a contiguous block down", () => {
    const order = ["a", "b", "c", "d", "e"];
    expect(reorderSelectedBlock(order, new Set(["b", "c"]), 1)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("moves a contiguous block up", () => {
    const order = ["a", "b", "c", "d", "e"];
    expect(reorderSelectedBlock(order, new Set(["b", "c"]), -1)).toEqual(["b", "c", "a", "d", "e"]);
  });
});

describe("reorderSelectedToEdge", () => {
  it("moves selected fields to the top", () => {
    const order = ["a", "b", "c", "d"];
    expect(reorderSelectedToEdge(order, new Set(["b", "d"]), true)).toEqual(["b", "d", "a", "c"]);
  });
});
