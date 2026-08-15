import type { AnnotateFilterNote } from "./annotateFilters";

export type LinkedDocumentTargetKind = "document" | "anchor";

export type LinkedDocumentEntry = {
  /** Stable key: record + optional anchor. */
  key: string;
  target_record_id: string;
  target_doc_number: string;
  target_name: string;
  target_major?: number;
  target_minor?: number;
  link_anchor_id?: string;
  link_anchor_title?: string;
  target_kind: LinkedDocumentTargetKind;
  /** True when at least one link annotation references this target (Veeva green icon). */
  in_use: boolean;
  annotation_ids: string[];
};

function linkKey(note: AnnotateFilterNote): string | null {
  const recordId = (note.link_record_id ?? "").trim();
  const docNumber = (note.link_doc_number ?? "").trim();
  if (!recordId && !docNumber) {
    return null;
  }
  const anchor = (note.link_anchor_id ?? "").trim();
  return `${recordId || docNumber}|${anchor}`;
}

/** Aggregate document_link annotations into Linked Documents panel rows. */
export function buildLinkedDocuments(notes: AnnotateFilterNote[]): LinkedDocumentEntry[] {
  const byKey = new Map<string, LinkedDocumentEntry>();
  for (const note of notes) {
    if (note.kind !== "document_link") {
      continue;
    }
    const key = linkKey(note);
    if (!key) {
      continue;
    }
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.annotation_ids.includes(note.id)) {
        existing.annotation_ids.push(note.id);
      }
      continue;
    }
    const anchorId = (note.link_anchor_id ?? "").trim();
    byKey.set(key, {
      key,
      target_record_id: (note.link_record_id ?? "").trim(),
      target_doc_number: (note.link_doc_number ?? "").trim(),
      target_name: (note.link_name ?? "").trim() || (note.link_doc_number ?? "").trim() || note.title,
      target_major: note.link_major,
      target_minor: note.link_minor,
      link_anchor_id: anchorId || undefined,
      link_anchor_title: (note.link_anchor_title ?? "").trim() || undefined,
      target_kind: anchorId ? "anchor" : "document",
      in_use: true,
      annotation_ids: [note.id],
    });
  }
  return [...byKey.values()].sort((a, b) => {
    const an = a.target_name || a.target_doc_number;
    const bn = b.target_name || b.target_doc_number;
    const byName = an.localeCompare(bn);
    if (byName !== 0) {
      return byName;
    }
    return (a.link_anchor_title ?? "").localeCompare(b.link_anchor_title ?? "");
  });
}
