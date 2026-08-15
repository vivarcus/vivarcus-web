import { describe, expect, it } from "vitest";
import { buildRecordNavState, resolveListRecordNav } from "./vaultNav";

describe("buildRecordNavState", () => {
  it("builds absolute list position for a record on the current page", () => {
    const state = buildRecordNavState(
      {
        pageRecordIds: ["r1", "r2", "r3"],
        pageStart: 21,
        recordTotal: 40,
        tabApiName: "studies",
        tabLabel: "Studies",
        objectLabel: "Study",
      },
      "r2",
    );

    expect(state).toEqual({
      tabApiName: "studies",
      tabLabel: "Studies",
      objectLabel: "Study",
      recordIndex: 22,
      recordTotal: 40,
      pageStart: 21,
      pageRecordIds: ["r1", "r2", "r3"],
    });
  });

  it("defaults pageStart to 1 when omitted", () => {
    const state = buildRecordNavState(
      {
        pageRecordIds: ["a", "b"],
        recordTotal: 2,
      },
      "b",
    );
    expect(state?.recordIndex).toBe(2);
    expect(state?.pageStart).toBe(1);
  });

  it("normalizes numeric record ids from the list payload", () => {
    const state = buildRecordNavState(
      {
        pageRecordIds: [101, 102, 103] as unknown as string[],
        pageStart: 1,
        recordTotal: 3,
      },
      "102",
    );
    expect(state).toMatchObject({
      recordIndex: 2,
      pageRecordIds: ["101", "102", "103"],
    });
  });

  it("returns undefined when the record is not on the current page", () => {
    expect(
      buildRecordNavState(
        { pageRecordIds: ["r1"], recordTotal: 10, pageStart: 1 },
        "missing",
      ),
    ).toBeUndefined();
  });
});

describe("resolveListRecordNav", () => {
  it("resolves previous and next neighbors with absolute indexes", () => {
    const resolved = resolveListRecordNav(
      {
        pageRecordIds: ["r1", "r2", "r3"],
        pageStart: 5,
        recordTotal: 20,
      },
      "r2",
    );

    expect(resolved).toMatchObject({
      indexInPage: 1,
      recordIndex: 6,
      prevRecordId: "r1",
      nextRecordId: "r3",
    });
  });

  it("disables previous on the first row of the page", () => {
    const resolved = resolveListRecordNav(
      { pageRecordIds: ["r1", "r2"], pageStart: 1, recordTotal: 5 },
      "r1",
    );
    expect(resolved.prevRecordId).toBeUndefined();
    expect(resolved.nextRecordId).toBe("r2");
    expect(resolved.recordIndex).toBe(1);
  });
});
