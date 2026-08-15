import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  readExpandedSections,
  resolveExpandedSections,
  scrollToRecordSection,
  sectionDomId,
  sectionExpandStorageKey,
  writeExpandedSections,
} from "./recordSectionUtils";

describe("recordSectionUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

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

  it("persists and restores expanded section ids", () => {
    const key = sectionExpandStorageKey("v1", "study__v", "abc", "layout__v");
    writeExpandedSections(key, new Set(["section-a", "section-b"]));
    expect(readExpandedSections(key)).toEqual(new Set(["section-a", "section-b"]));
  });

  it("falls back to the first section when storage is empty", () => {
    const sections = [
      { label: { text: "General" }, name: "general__c" },
      { label: { text: "Details" }, name: "details__c" },
    ];
    const key = sectionExpandStorageKey("v1", "study__v", "abc");
    expect(resolveExpandedSections(sections, key)).toEqual(new Set(["section-general__c"]));
  });

  it("ignores stale stored section ids after layout changes", () => {
    const sections = [{ label: { text: "Only" }, name: "only__c" }];
    const key = sectionExpandStorageKey("v1", "study__v", "abc");
    writeExpandedSections(key, new Set(["section-removed__c"]));
    expect(resolveExpandedSections(sections, key)).toEqual(new Set(["section-only__c"]));
  });
});
