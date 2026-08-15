export type AnnotateKind = "note" | "anchor" | "line" | "document_link" | "permalink";
export type AnnotatePlacement = "placed" | "page_level";

export type AnnotateFilterNote = {
  id: string;
  kind: AnnotateKind;
  title: string;
  body: string;
  resolved?: boolean;
  placement?: AnnotatePlacement;
  brought_forward?: boolean;
  source_major?: number;
  source_minor?: number;
  link_doc_number?: string;
  link_major?: number;
  link_minor?: number;
  link_record_id?: string;
  link_name?: string;
  link_page?: number;
  link_anchor_id?: string;
  link_anchor_title?: string;
  created_at?: string;
  created_by?: string;
  created_by_name?: string;
  tags?: string[];
};

export type AnnotateKindFilter = "all" | AnnotateKind | "none";
export type AnnotateNoteStatusFilter = "all" | "open" | "resolved" | "none";
export type AnnotatePlacementFilter = "all" | AnnotatePlacement;
export type AnnotateLinkFilter = "all" | "document_link" | "permalink" | "anchor" | "none";
export type AnnotateCreatedFilter = "all" | "today" | "last_7_days" | "last_30_days";
export type AnnotateVersionFilter = "all" | "this" | "previous";

export type AnnotateFilters = {
  keyword: string;
  kind: AnnotateKindFilter;
  noteStatus: AnnotateNoteStatusFilter;
  placement: AnnotatePlacementFilter;
  linkKind: AnnotateLinkFilter;
  created: AnnotateCreatedFilter;
  /** Empty set means "all authors". */
  authors: Set<string>;
  /** Empty set means "all tags". */
  tags: Set<string>;
  version: AnnotateVersionFilter;
};

export type AnnotateAuthorFacet = {
  id: string;
  label: string;
  count: number;
};

export type AnnotateTagFacet = {
  id: string;
  label: string;
  count: number;
};

export type AnnotateFilterFacets = {
  kinds: Record<AnnotateKind | "all", number>;
  noteStatus: Record<"all" | "open" | "resolved", number>;
  placements: Record<"all" | AnnotatePlacement, number>;
  links: { all: number; document_link: number; permalink: number; anchor: number };
  created: Record<AnnotateCreatedFilter, number>;
  authors: AnnotateAuthorFacet[];
  tags: AnnotateTagFacet[];
  versions: Record<AnnotateVersionFilter, number>;
};

export const defaultAnnotateFilters = (): AnnotateFilters => ({
  keyword: "",
  kind: "all",
  noteStatus: "all",
  placement: "all",
  linkKind: "all",
  created: "all",
  authors: new Set(),
  tags: new Set(),
  version: "all",
});

export function annotateFiltersActive(filters: AnnotateFilters): boolean {
  return (
    filters.keyword.trim() !== "" ||
    filters.kind !== "all" ||
    filters.noteStatus !== "all" ||
    filters.placement !== "all" ||
    filters.linkKind !== "all" ||
    filters.created !== "all" ||
    filters.authors.size > 0 ||
    filters.tags.size > 0 ||
    filters.version !== "all"
  );
}

export function authorKey(note: AnnotateFilterNote): string {
  const id = note.created_by?.trim();
  return id || "__unknown__";
}

export function authorLabel(note: AnnotateFilterNote): string {
  const name = note.created_by_name?.trim();
  if (name) {
    return name;
  }
  const id = note.created_by?.trim();
  if (id) {
    return id.length > 8 ? `${id.slice(0, 8)}…` : id;
  }
  return "Unknown";
}

export function notePlacement(note: AnnotateFilterNote): AnnotatePlacement {
  return note.placement === "page_level" ? "page_level" : "placed";
}

/** Brought-forward annotations count as previous-version origin (Veeva Version filter). */
export function noteVersionBucket(note: AnnotateFilterNote): "this" | "previous" {
  if (note.brought_forward || note.source_major != null) {
    return "previous";
  }
  return "this";
}

export function noteCreatedBucket(
  note: AnnotateFilterNote,
  now = new Date(),
): Exclude<AnnotateCreatedFilter, "all"> | "older" {
  if (!note.created_at) {
    return "older";
  }
  const created = new Date(note.created_at);
  if (Number.isNaN(created.getTime())) {
    return "older";
  }
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (created >= startOfToday) {
    return "today";
  }
  const last7 = new Date(startOfToday);
  last7.setDate(last7.getDate() - 6);
  if (created >= last7) {
    return "last_7_days";
  }
  const last30 = new Date(startOfToday);
  last30.setDate(last30.getDate() - 29);
  if (created >= last30) {
    return "last_30_days";
  }
  return "older";
}

export function noteMatchesCreatedFilter(
  note: AnnotateFilterNote,
  filter: AnnotateCreatedFilter,
  now = new Date(),
): boolean {
  if (filter === "all") {
    return true;
  }
  const bucket = noteCreatedBucket(note, now);
  if (filter === "today") {
    return bucket === "today";
  }
  if (filter === "last_7_days") {
    return bucket === "today" || bucket === "last_7_days";
  }
  if (filter === "last_30_days") {
    return bucket === "today" || bucket === "last_7_days" || bucket === "last_30_days";
  }
  return true;
}

export function buildAnnotateFacets(
  notes: AnnotateFilterNote[],
  now = new Date(),
): AnnotateFilterFacets {
  const kinds: AnnotateFilterFacets["kinds"] = {
    all: notes.length,
    note: 0,
    anchor: 0,
    line: 0,
    document_link: 0,
    permalink: 0,
  };
  const noteStatus: AnnotateFilterFacets["noteStatus"] = {
    all: 0,
    open: 0,
    resolved: 0,
  };
  const placements: AnnotateFilterFacets["placements"] = {
    all: notes.length,
    placed: 0,
    page_level: 0,
  };
  const links: AnnotateFilterFacets["links"] = {
    all: notes.length,
    document_link: 0,
    permalink: 0,
    anchor: 0,
  };
  const created: AnnotateFilterFacets["created"] = {
    all: notes.length,
    today: 0,
    last_7_days: 0,
    last_30_days: 0,
  };
  const versions: AnnotateFilterFacets["versions"] = {
    all: notes.length,
    this: 0,
    previous: 0,
  };
  const authorMap = new Map<string, AnnotateAuthorFacet>();
  const tagMap = new Map<string, AnnotateTagFacet>();

  for (const note of notes) {
    kinds[note.kind] += 1;
    versions[noteVersionBucket(note)] += 1;
    placements[notePlacement(note)] += 1;
    if (noteMatchesCreatedFilter(note, "today", now)) {
      created.today += 1;
    }
    if (noteMatchesCreatedFilter(note, "last_7_days", now)) {
      created.last_7_days += 1;
    }
    if (noteMatchesCreatedFilter(note, "last_30_days", now)) {
      created.last_30_days += 1;
    }
    if (note.kind === "document_link") {
      if (note.link_anchor_id) {
        links.anchor += 1;
      } else {
        links.document_link += 1;
      }
    }
    if (note.kind === "permalink") {
      links.permalink += 1;
    }
    if (note.kind === "note") {
      noteStatus.all += 1;
      if (note.resolved) {
        noteStatus.resolved += 1;
      } else {
        noteStatus.open += 1;
      }
    }
    const key = authorKey(note);
    const existing = authorMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      authorMap.set(key, { id: key, label: authorLabel(note), count: 1 });
    }
    for (const tag of note.tags ?? []) {
      const tagKey = tag.trim();
      if (!tagKey) {
        continue;
      }
      const existingTag = tagMap.get(tagKey);
      if (existingTag) {
        existingTag.count += 1;
      } else {
        tagMap.set(tagKey, { id: tagKey, label: tagKey, count: 1 });
      }
    }
  }

  return {
    kinds,
    noteStatus,
    placements,
    links,
    created,
    authors: [...authorMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    tags: [...tagMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    versions,
  };
}

/** Page → top → left reading order for list + prev/next navigation (Veeva-style). */
export type AnnotateNavSortable = {
  id: string;
  page?: number;
  x_min?: number;
  y_min?: number;
};

export function sortAnnotationsForNavigation<T extends AnnotateNavSortable>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    const pageDiff = (a.page ?? 0) - (b.page ?? 0);
    if (pageDiff !== 0) {
      return pageDiff;
    }
    const yDiff = (a.y_min ?? 0) - (b.y_min ?? 0);
    if (yDiff !== 0) {
      return yDiff;
    }
    const xDiff = (a.x_min ?? 0) - (b.x_min ?? 0);
    if (xDiff !== 0) {
      return xDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

export function annotationNavIndex(notes: { id: string }[], selectedId: string | null): number {
  if (!selectedId) {
    return -1;
  }
  return notes.findIndex((n) => n.id === selectedId);
}

export function filterAnnotations<T extends AnnotateFilterNote>(
  notes: T[],
  filters: AnnotateFilters,
  now = new Date(),
): T[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return notes.filter((note) => {
    if (filters.kind === "none") {
      return false;
    }
    if (filters.kind !== "all" && note.kind !== filters.kind) {
      return false;
    }
    if (note.kind === "note") {
      if (filters.noteStatus === "none") {
        return false;
      }
      if (filters.noteStatus === "open" && note.resolved) {
        return false;
      }
      if (filters.noteStatus === "resolved" && !note.resolved) {
        return false;
      }
    }
    if (filters.linkKind === "document_link") {
      if (note.kind !== "document_link" || note.link_anchor_id) {
        return false;
      }
    }
    if (filters.linkKind === "anchor") {
      if (note.kind !== "document_link" || !note.link_anchor_id) {
        return false;
      }
    }
    if (filters.linkKind === "permalink" && note.kind !== "permalink") {
      return false;
    }
    if (
      filters.linkKind === "none" &&
      (note.kind === "document_link" || note.kind === "permalink")
    ) {
      return false;
    }
    if (filters.placement !== "all" && notePlacement(note) !== filters.placement) {
      return false;
    }
    if (!noteMatchesCreatedFilter(note, filters.created, now)) {
      return false;
    }
    if (filters.authors.size > 0 && !filters.authors.has(authorKey(note))) {
      return false;
    }
    if (filters.tags.size > 0) {
      const noteTags = new Set((note.tags ?? []).map((t) => t.trim()).filter(Boolean));
      let matched = false;
      for (const tag of filters.tags) {
        if (noteTags.has(tag)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return false;
      }
    }
    if (filters.version !== "all" && noteVersionBucket(note) !== filters.version) {
      return false;
    }
    if (keyword) {
      const haystack = `${note.title}\n${note.body}\n${note.link_doc_number ?? ""}\n${note.link_name ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }
    return true;
  });
}
