import { describe, expect, it } from "vitest";
import {
  NAV_TRAIL_MAX_HOPS,
  NAV_TRAIL_PARAM,
  decodeNavTrail,
  encodeNavTrail,
  navTrailBackHref,
  navTrailBreadcrumbItems,
  pushNavTrail,
  stripNavTrailParam,
  withNavTrail,
} from "./navTrail";

describe("navTrail encode/decode", () => {
  it("round-trips hops including non-ASCII labels", () => {
    const hops = [{ href: "/objects/edl_item__v/records/LFA001", label: "方案 Protocol" }];
    expect(decodeNavTrail(encodeNavTrail(hops))).toEqual(hops);
  });

  it("returns an empty trail for blank or corrupt input", () => {
    expect(decodeNavTrail(undefined)).toEqual([]);
    expect(decodeNavTrail("")).toEqual([]);
    expect(decodeNavTrail("not-base64!!")).toEqual([]);
    expect(encodeNavTrail([])).toBe("");
  });

  it("drops hops pointing outside the SPA", () => {
    const encoded = encodeNavTrail([
      { href: "https://evil.example.com", label: "Evil" },
      { href: "//evil.example.com", label: "Evil" },
      { href: "/objects/study__v/records/S1", label: "Study" },
    ]);
    expect(decodeNavTrail(encoded)).toEqual([
      { href: "/objects/study__v/records/S1", label: "Study" },
    ]);
  });

  it("keeps only the newest hops when the trail grows too deep", () => {
    const hops = Array.from({ length: NAV_TRAIL_MAX_HOPS + 2 }, (_, i) => ({
      href: `/objects/study__v/records/S${i}`,
      label: `S${i}`,
    }));
    const decoded = decodeNavTrail(encodeNavTrail(hops));
    expect(decoded).toHaveLength(NAV_TRAIL_MAX_HOPS);
    expect(decoded[decoded.length - 1].label).toBe(`S${NAV_TRAIL_MAX_HOPS + 1}`);
  });
});

describe("withNavTrail", () => {
  it("attaches the trail while preserving existing query params", () => {
    const href = withNavTrail("/objects/document__v/create?tab=library__v", "abc");
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.get("tab")).toBe("library__v");
    expect(url.searchParams.get(NAV_TRAIL_PARAM)).toBe("abc");
  });

  it("replaces any trail the href already carries", () => {
    const href = withNavTrail(`/x?${NAV_TRAIL_PARAM}=old`, "new");
    expect(new URL(href, "http://localhost").searchParams.get(NAV_TRAIL_PARAM)).toBe("new");
  });

  it("leaves the href untouched when the trail is empty", () => {
    expect(withNavTrail("/objects/study__v/records/S1", "")).toBe("/objects/study__v/records/S1");
    expect(withNavTrail(`/objects/study__v/records/S1?${NAV_TRAIL_PARAM}=old`, "")).toBe(
      "/objects/study__v/records/S1",
    );
  });
});

describe("stripNavTrailParam", () => {
  it("removes only the trail param", () => {
    expect(stripNavTrailParam(`?tab=library__v&${NAV_TRAIL_PARAM}=abc`)).toBe("?tab=library__v");
    expect(stripNavTrailParam(`?${NAV_TRAIL_PARAM}=abc`)).toBe("");
    expect(stripNavTrailParam("")).toBe("");
  });
});

describe("pushNavTrail", () => {
  it("appends the current page as the newest hop", () => {
    const encoded = pushNavTrail("?tab=edl_items__c", {
      pathname: "/objects/edl_item__v/records/LFA001",
      label: "Protocol Item",
    });
    expect(decodeNavTrail(encoded)).toEqual([
      { href: "/objects/edl_item__v/records/LFA001?tab=edl_items__c", label: "Protocol Item" },
    ]);
  });

  it("chains onto the trail the current page already carries, without nesting it", () => {
    const first = pushNavTrail("", {
      pathname: "/pages/milestone_workspace__v",
      label: "Milestone",
    });
    const second = pushNavTrail(`?${NAV_TRAIL_PARAM}=${first}`, {
      pathname: "/objects/edl_item__v/records/LFA001",
      label: "Protocol Item",
    });
    expect(decodeNavTrail(second)).toEqual([
      { href: "/pages/milestone_workspace__v", label: "Milestone" },
      { href: "/objects/edl_item__v/records/LFA001", label: "Protocol Item" },
    ]);
  });
});

describe("navTrailBackHref", () => {
  it("returns the newest hop carrying its own ancestors", () => {
    const hops = [
      { href: "/pages/milestone_workspace__v", label: "Milestone" },
      { href: "/objects/edl_item__v/records/LFA001", label: "Protocol Item" },
    ];
    const back = navTrailBackHref(hops);
    const url = new URL(back!, "http://localhost");
    expect(url.pathname).toBe("/objects/edl_item__v/records/LFA001");
    expect(decodeNavTrail(url.searchParams.get(NAV_TRAIL_PARAM))).toEqual([hops[0]]);
  });

  it("is undefined for an empty trail", () => {
    expect(navTrailBackHref([])).toBeUndefined();
  });
});

describe("navTrailBreadcrumbItems", () => {
  it("links each crumb with the trail truncated to its own ancestors", () => {
    const hops = [
      { href: "/pages/milestone_workspace__v", label: "Milestone" },
      { href: "/objects/edl_item__v/records/LFA001", label: "Protocol Item" },
    ];
    const items = navTrailBreadcrumbItems(hops);
    expect(items.map((item) => item.label)).toEqual(["Milestone", "Protocol Item"]);
    expect(items[0].to).toBe("/pages/milestone_workspace__v");
    expect(
      decodeNavTrail(new URL(items[1].to, "http://localhost").searchParams.get(NAV_TRAIL_PARAM)),
    ).toEqual([hops[0]]);
  });
});
