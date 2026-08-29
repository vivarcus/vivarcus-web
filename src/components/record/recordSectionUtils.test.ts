import { describe, expect, it, vi } from "vitest";
import {
  defaultExpandedSections,
  retainExpandedSections,
  scrollToRecordSection,
  sectionDomId,
} from "./recordSectionUtils";

describe("recordSectionUtils", () => {
  it("builds stable section dom ids", () => {
    expect(sectionDomId({ label: { text: "General" }, name: "general__c" }, 0)).toBe(
      "section-general__c",
    );
    expect(sectionDomId({ label: { text: "Fallback" } }, 2)).toBe("section-2");
  });

  it("scrolls to a section element", () => {
    const scrollIntoView = vi.fn();
    const node = document.createElement("section");
    node.id = "section-general__c";
    node.scrollIntoView = scrollIntoView;
    document.body.appendChild(node);

    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    scrollToRecordSection("section-general__c");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    raf.mockRestore();
    node.remove();
  });

  it("defaults to the first section", () => {
    const sections = [
      { label: { text: "General" }, name: "general__c" },
      { label: { text: "Details" }, name: "details__c" },
    ];
    expect(defaultExpandedSections(sections)).toEqual(new Set(["section-general__c"]));
  });

  it("keeps still-valid expanded sections on same-record refresh", () => {
    const sections = [
      { label: { text: "General" }, name: "general__c" },
      { label: { text: "Details" }, name: "details__c" },
    ];
    expect(
      retainExpandedSections(sections, new Set(["section-details__c", "section-gone__c"])),
    ).toEqual(new Set(["section-details__c"]));
  });

  it("falls back to the first section when none of the previous ids remain", () => {
    const sections = [{ label: { text: "Only" }, name: "only__c" }];
    expect(retainExpandedSections(sections, new Set(["section-removed__c"]))).toEqual(
      new Set(["section-only__c"]),
    );
  });
});
