import { describe, expect, it } from "vitest";
import {
  annotateFiltersActive,
  annotationNavIndex,
  authorKey,
  authorLabel,
  buildAnnotateFacets,
  defaultAnnotateFilters,
  filterAnnotations,
  sortAnnotationsForNavigation,
  type AnnotateFilterNote,
} from "./annotateFilters";

const notes: AnnotateFilterNote[] = [
  {
    id: "1",
    kind: "note",
    title: "Protocol risk",
    body: "Check section 4",
    resolved: false,
    placement: "placed",
    created_by: "u-a",
    created_by_name: "Alice",
    tags: ["Medical", "Legal"],
  },
  {
    id: "2",
    kind: "line",
    title: "Mark",
    body: "red line",
    placement: "placed",
    created_by: "u-b",
    created_by_name: "Bob",
    tags: ["Medical"],
  },
  {
    id: "3",
    kind: "anchor",
    title: "Link target",
    body: "",
    placement: "page_level",
    created_by: "u-a",
    created_by_name: "Alice",
  },
  {
    id: "4",
    kind: "note",
    title: "Done item",
    body: "fixed",
    resolved: true,
    placement: "placed",
    created_by: "u-b",
    created_by_name: "Bob",
  },
  {
    id: "5",
    kind: "note",
    title: "From prior",
    body: "brought",
    resolved: false,
    placement: "placed",
    brought_forward: true,
    source_major: 0,
    source_minor: 2,
    created_by: "u-a",
    created_by_name: "Alice",
  },
  {
    id: "6",
    kind: "document_link",
    title: "SOP Manual",
    body: "see SOP",
    placement: "placed",
    link_doc_number: "DOC-9",
    link_major: 1,
    link_minor: 0,
    link_record_id: "V00000000000001",
    link_name: "SOP Manual",
    created_by: "u-b",
    created_by_name: "Bob",
    tags: ["Legal"],
  },
  {
    id: "8",
    kind: "document_link",
    title: "Risk heading",
    body: "",
    placement: "placed",
    link_doc_number: "DOC-9",
    link_major: 1,
    link_minor: 0,
    link_record_id: "V00000000000001",
    link_name: "SOP Manual",
    link_anchor_id: "a-1",
    link_anchor_title: "Risks",
    created_by: "u-a",
    created_by_name: "Alice",
  },
  {
    id: "7",
    kind: "permalink",
    title: "Latest SOP",
    body: "",
    placement: "placed",
    link_doc_number: "DOC-9",
    link_record_id: "V00000000000001",
    link_name: "SOP Manual",
    link_page: 2,
    created_by: "u-a",
    created_by_name: "Alice",
  },
];

describe("annotateFilters", () => {
  it("reports active filters", () => {
    expect(annotateFiltersActive(defaultAnnotateFilters())).toBe(false);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), keyword: "risk" })).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), kind: "note" })).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), noteStatus: "open" })).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), placement: "page_level" })).toBe(
      true,
    );
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), linkKind: "document_link" })).toBe(
      true,
    );
    expect(
      annotateFiltersActive({ ...defaultAnnotateFilters(), authors: new Set(["u-a"]) }),
    ).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), version: "this" })).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), created: "today" })).toBe(true);
    expect(annotateFiltersActive({ ...defaultAnnotateFilters(), tags: new Set(["Legal"]) })).toBe(
      true,
    );
  });

  it("filters by keyword across title and body", () => {
    const filters = { ...defaultAnnotateFilters(), keyword: "section" };
    expect(filterAnnotations(notes, filters).map((n) => n.id)).toEqual(["1"]);
  });

  it("filters by kind including none", () => {
    expect(filterAnnotations(notes, { ...defaultAnnotateFilters(), kind: "anchor" }).map((n) => n.id)).toEqual([
      "3",
    ]);
    expect(filterAnnotations(notes, { ...defaultAnnotateFilters(), kind: "none" })).toEqual([]);
  });

  it("filters notes by resolve status without dropping other kinds", () => {
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), noteStatus: "open" }).map((n) => n.id),
    ).toEqual(["1", "2", "3", "5", "6", "8", "7"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), noteStatus: "resolved" }).map((n) => n.id),
    ).toEqual(["2", "3", "4", "6", "8", "7"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), noteStatus: "none" }).map((n) => n.id),
    ).toEqual(["2", "3", "6", "8", "7"]);
  });

  it("filters by placement", () => {
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), placement: "page_level" }).map((n) => n.id),
    ).toEqual(["3"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), placement: "placed" }).map((n) => n.id),
    ).toEqual(["1", "2", "4", "5", "6", "8", "7"]);
  });

  it("filters by link kind", () => {
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), linkKind: "document_link" }).map(
        (n) => n.id,
      ),
    ).toEqual(["6"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), linkKind: "permalink" }).map(
        (n) => n.id,
      ),
    ).toEqual(["7"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), linkKind: "anchor" }).map((n) => n.id),
    ).toEqual(["8"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), linkKind: "none" }).map((n) => n.id),
    ).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("filters by author set", () => {
    const filtered = filterAnnotations(notes, {
      ...defaultAnnotateFilters(),
      authors: new Set(["u-a"]),
    });
    expect(filtered.map((n) => n.id)).toEqual(["1", "3", "5", "8", "7"]);
  });

  it("filters by tags (any-of selected)", () => {
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), tags: new Set(["Legal"]) }).map(
        (n) => n.id,
      ),
    ).toEqual(["1", "6"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), tags: new Set(["Medical"]) }).map(
        (n) => n.id,
      ),
    ).toEqual(["1", "2"]);
  });

  it("filters previous version to brought-forward annotations", () => {
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), version: "previous" }).map((n) => n.id),
    ).toEqual(["5"]);
    expect(
      filterAnnotations(notes, { ...defaultAnnotateFilters(), version: "this" }).map((n) => n.id),
    ).toEqual(["1", "2", "3", "4", "6", "8", "7"]);
  });

  it("filters by creation date presets", () => {
    const now = new Date("2026-07-31T12:00:00Z");
    const dated: AnnotateFilterNote[] = [
      { ...notes[0], id: "d1", created_at: "2026-07-31T08:00:00Z" },
      { ...notes[1], id: "d2", created_at: "2026-07-28T08:00:00Z" },
      { ...notes[2], id: "d3", created_at: "2026-07-10T08:00:00Z" },
      { ...notes[3], id: "d4", created_at: "2026-06-01T08:00:00Z" },
    ];
    expect(
      filterAnnotations(dated, { ...defaultAnnotateFilters(), created: "today" }, now).map(
        (n) => n.id,
      ),
    ).toEqual(["d1"]);
    expect(
      filterAnnotations(dated, { ...defaultAnnotateFilters(), created: "last_7_days" }, now).map(
        (n) => n.id,
      ),
    ).toEqual(["d1", "d2"]);
    expect(
      filterAnnotations(dated, { ...defaultAnnotateFilters(), created: "last_30_days" }, now).map(
        (n) => n.id,
      ),
    ).toEqual(["d1", "d2", "d3"]);
    expect(buildAnnotateFacets(dated, now).created).toEqual({
      all: 4,
      today: 1,
      last_7_days: 2,
      last_30_days: 3,
    });
  });

  it("builds facets with counts", () => {
    const facets = buildAnnotateFacets(notes);
    expect(facets.kinds).toEqual({
      all: 8,
      note: 3,
      anchor: 1,
      line: 1,
      document_link: 2,
      permalink: 1,
    });
    expect(facets.noteStatus).toEqual({ all: 3, open: 2, resolved: 1 });
    expect(facets.placements).toEqual({ all: 8, placed: 7, page_level: 1 });
    expect(facets.links).toEqual({ all: 8, document_link: 1, permalink: 1, anchor: 1 });
    expect(facets.created.all).toBe(8);
    expect(facets.tags).toEqual([
      { id: "Legal", label: "Legal", count: 2 },
      { id: "Medical", label: "Medical", count: 2 },
    ]);
    expect(facets.versions).toEqual({ all: 8, this: 7, previous: 1 });
    expect(facets.authors).toEqual([
      { id: "u-a", label: "Alice", count: 5 },
      { id: "u-b", label: "Bob", count: 3 },
    ]);
  });

  it("falls back author label when name missing", () => {
    expect(authorKey({ id: "x", kind: "note", title: "", body: "" })).toBe("__unknown__");
    expect(authorLabel({ id: "x", kind: "note", title: "", body: "", created_by: "abcdefghij" })).toBe(
      "abcdefgh…",
    );
  });

  it("sorts annotations in page → top → left order for navigation", () => {
    const unsorted = [
      { id: "c", page: 2, x_min: 10, y_min: 10 },
      { id: "a", page: 1, x_min: 50, y_min: 20 },
      { id: "b", page: 1, x_min: 10, y_min: 20 },
      { id: "d", page: 1, x_min: 10, y_min: 5 },
    ];
    expect(sortAnnotationsForNavigation(unsorted).map((n) => n.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("resolves navigation index for the selected annotation", () => {
    const ordered = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ];
    expect(annotationNavIndex(ordered, null)).toBe(-1);
    expect(annotationNavIndex(ordered, "b")).toBe(1);
    expect(annotationNavIndex(ordered, "missing")).toBe(-1);
  });
});
