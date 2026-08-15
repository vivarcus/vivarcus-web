import { describe, expect, it } from "vitest";
import { buildLinkedDocuments } from "./annotateLinkedDocuments";
import type { AnnotateFilterNote } from "./annotateFilters";

const base = (partial: Partial<AnnotateFilterNote> & { id: string }): AnnotateFilterNote => ({
  kind: "document_link",
  title: "Link",
  body: "",
  ...partial,
});

describe("buildLinkedDocuments", () => {
  it("aggregates unique targets and keeps annotation ids", () => {
    const notes: AnnotateFilterNote[] = [
      base({
        id: "a1",
        link_record_id: "r1",
        link_doc_number: "DOC-1",
        link_name: "Protocol",
        link_major: 1,
        link_minor: 0,
      }),
      base({
        id: "a2",
        link_record_id: "r1",
        link_doc_number: "DOC-1",
        link_name: "Protocol",
        link_major: 1,
        link_minor: 0,
      }),
      base({
        id: "a3",
        link_record_id: "r2",
        link_doc_number: "DOC-2",
        link_name: "IB",
        link_anchor_id: "anch-1",
        link_anchor_title: "Safety",
        link_major: 2,
        link_minor: 1,
      }),
      {
        id: "n1",
        kind: "note",
        title: "Note",
        body: "x",
      },
    ];
    const linked = buildLinkedDocuments(notes);
    expect(linked).toHaveLength(2);
    const protocol = linked.find((l) => l.target_record_id === "r1");
    expect(protocol?.target_kind).toBe("document");
    expect(protocol?.in_use).toBe(true);
    expect(protocol?.annotation_ids).toEqual(["a1", "a2"]);
    const ib = linked.find((l) => l.target_record_id === "r2");
    expect(ib?.target_kind).toBe("anchor");
    expect(ib?.link_anchor_title).toBe("Safety");
  });

  it("sorts by target name", () => {
    const linked = buildLinkedDocuments([
      base({
        id: "1",
        link_record_id: "r-z",
        link_doc_number: "Z",
        link_name: "Zebra",
      }),
      base({
        id: "2",
        link_record_id: "r-a",
        link_doc_number: "A",
        link_name: "Alpha",
      }),
    ]);
    expect(linked.map((l) => l.target_name)).toEqual(["Alpha", "Zebra"]);
  });

  it("ignores notes without link targets", () => {
    expect(
      buildLinkedDocuments([
        base({ id: "1", title: "orphan" }),
        base({ id: "2", kind: "permalink", link_doc_number: "P", link_record_id: "rp" }),
      ]),
    ).toEqual([]);
  });
});
