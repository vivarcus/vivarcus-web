import { Button, Input, Modal, message, Spin, Tooltip } from "antd";
import {
  CloseOutlined,
  CommentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  LinkOutlined,
  PaperClipOutlined,
  RetweetOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from "@ant-design/icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { api, HttpError } from "../../api/client";
import type { DocumentViewerState, FeishuImportAvailability, SdkAction } from "../../api/types";
import {
  DocumentSourceUploadModal,
  type DocumentCreateDraftSelection,
  type DocumentSourceSelection,
} from "./DocumentSourceUploadModal";
import { DocumentMediaPlayer, mediaPlayerKind } from "./DocumentMediaPlayer";
import { FeishuImportModal } from "./FeishuImportModal";
import { AnnotationMentionField } from "./AnnotationMentionField";
import type { DocumentUploadRequest } from "../../hooks/useRecordLifecycleActions";
import { DOCUMENT_TOOLBAR_ACTION_NAMES, findSdkAction, isDocumentCreateDraftAction } from "../../lib/documentActions";
import { documentActionIcon } from "./recordActionIcon";
import {
  canUploadSourceOutsideCheckin,
  canUploadSourceViaCheckin,
  isCheckinSourceUpload,
  viaCheckinUpload,
} from "../../lib/documentCheckout";
import { externalSourceEditAction, externalSourceResyncRequest } from "../../lib/externalSource";
import { displayText, displayTextTemplate } from "../../lib/i18n";
import { defaultDocumentViewerChrome } from "../../lib/i18n/chromeTypes";
import { useUi } from "../../context/UiContext";
import { recordDisplayName } from "../../lib/recordDisplayName";
import {
  annotateFiltersActive,
  annotationNavIndex,
  buildAnnotateFacets,
  defaultAnnotateFilters,
  filterAnnotations,
  sortAnnotationsForNavigation,
  type AnnotateFilters,
  type AnnotateCreatedFilter,
  type AnnotateKindFilter,
  type AnnotateLinkFilter,
  type AnnotateNoteStatusFilter,
  type AnnotatePlacementFilter,
  type AnnotateVersionFilter,
} from "../../lib/annotateFilters";
import {
  resolveTextSelection,
  wordsIntersectingRect,
  type AnnotateWord,
  type RelDraft,
} from "../../lib/annotateWordSelect";
import {
  ANCHOR_CREATED_MESSAGE,
  isCreateAnchorMode,
  openCreateAnchorWindow,
  publishAnchorCreated,
  subscribeAnchorCreated,
  truncateAnchorTitle,
} from "../../lib/annotateAnchorPicker";
import { buildLinkedDocuments } from "../../lib/annotateLinkedDocuments";
import { matchPageQueryHighlightBoxes } from "../../lib/matchPageQuery";

type AnnotateToolId = "select" | "note" | "anchor" | "line" | "document_link" | "permalink";
type AnnotatePlaceToolId = Exclude<AnnotateToolId, "select">;

const ANNOTATE_PLACE_TOOLS: Array<{
  id: AnnotatePlaceToolId;
  labelKey:
    | "annotations_type_note"
    | "annotations_type_line"
    | "annotations_type_document_link"
    | "annotations_type_permalink"
    | "annotations_type_anchor";
}> = [
  { id: "note", labelKey: "annotations_type_note" },
  { id: "line", labelKey: "annotations_type_line" },
  { id: "document_link", labelKey: "annotations_type_document_link" },
  { id: "permalink", labelKey: "annotations_type_permalink" },
  { id: "anchor", labelKey: "annotations_type_anchor" },
];

function isAnnotatePlaceTool(tool: AnnotateToolId): tool is AnnotatePlaceToolId {
  return (
    tool === "note" ||
    tool === "anchor" ||
    tool === "line" ||
    tool === "document_link" ||
    tool === "permalink"
  );
}

function sameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

/** Prefer readable chrome fallbacks over raw gateway/SQL messages. */
function annotateErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  if (!raw) {
    return fallback;
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes("page not found") ||
    lower === "not found" ||
    lower.includes("sqlstate") ||
    lower.startsWith("pq:") ||
    /^\d{3}\b/.test(raw)
  ) {
    return fallback;
  }
  return raw;
}

function AnnotateGlyph({ name }: { name: AnnotateToolId | "delete" }): ReactNode {
  const props = {
    width: 15,
    height: 15,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "select":
      return (
        <svg {...props}>
          <path
            d="M3.2 2.2 7.6 13.4l1.2-3.3 3.3-1.2L3.2 2.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "note":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="2.75" y="2.5" width="10.5" height="8.5" rx="1.2" />
          <path d="M5 5.4h6M5 7.8h4" strokeLinecap="round" />
        </svg>
      );
    case "anchor":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M6.4 9.2a2.35 2.35 0 0 1 0-3.3l1.35-1.35a2.35 2.35 0 0 1 3.3 3.3L9.7 9.2" />
          <path d="M9.6 6.8a2.35 2.35 0 0 1 0 3.3L8.25 11.45a2.35 2.35 0 0 1-3.3-3.3L6.3 6.8" />
        </svg>
      );
    case "line":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3.2 12.5 12.8 3.5" />
          <circle cx="3.2" cy="12.5" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="12.8" cy="3.5" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "document_link":
      return <LinkOutlined />;
    case "permalink":
      return <LinkOutlined style={{ color: "#7c3aed" }} />;
    case "delete":
      return <DeleteOutlined />;
  }
}

function DocumentActionGlyph({ name }: { name: string }): ReactNode {
  return documentActionIcon(name) ?? <DownloadOutlined />;
}

function ViewerIconButton(props: {
  title: string;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
}): ReactNode {
  const {
    title,
    ariaLabel,
    disabled = false,
    loading = false,
    danger = false,
    pressed,
    onClick,
    children,
  } = props;
  const button = (
    <button
      type="button"
      className={[
        "document-viewer__icon-btn",
        pressed ? "document-viewer__icon-btn--active" : "",
        danger ? "document-viewer__icon-btn--danger" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel ?? title}
      aria-pressed={pressed}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <SyncOutlined spin /> : children}
    </button>
  );
  return (
    <Tooltip title={title}>
      {disabled || loading ? <span className="document-viewer__icon-btn-wrap">{button}</span> : button}
    </Tooltip>
  );
}

type Props = {
  vaultId: string;
  objectApiName: string;
  recordId?: string;
  majorVersion?: number;
  minorVersion?: number;
  documentNumber?: string;
  documentUploadRequest?: DocumentUploadRequest | null;
  onDocumentUploadComplete?: (
    action: SdkAction,
    target: DocumentUploadRequest["target"],
  ) => Promise<void>;
  onDocumentUploadHandled?: () => void;
  documentActions?: SdkAction[];
  onDocumentAction?: (action: SdkAction) => void;
  documentActionPending?: boolean;
  viewerRefreshKey?: string;
  /** Reload record detail page after a version-bumping source upload (title, fields, actions). */
  onRecordPageReload?: () => Promise<void>;
  /** Toolbar + upload modals only (object record page); skips preview canvas. */
  toolbarOnly?: boolean;
  /** Hide chrome; keep mounted only to host upload / create-draft modals (list pages). */
  modalHostOnly?: boolean;
  /** Request scrolling the preview canvas to this 1-based page (re-fire via token). */
  focusPageRequest?: { page: number; token: number; query?: string } | null;
};

type LoadedPage = {
  page: number;
  url: string;
};

function formatByteLength(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function createDraftErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function formatCurrentVersionLabel(major?: number, minor?: number): string | undefined {
  if (major === undefined || minor === undefined) {
    return undefined;
  }
  return `${major}.${minor}`;
}

function documentKey(
  recordId: string,
  docId: string,
  majorVersion: number,
  minorVersion: number,
  objectApiName: string,
): string {
  return `${recordId}:${docId}:${majorVersion}.${minorVersion}:${objectApiName}`;
}

const FEISHU_PENDING_RESYNC_KEY = "feishu_pending_resync";
const FEISHU_PENDING_SOURCE_UPLOAD_KEY = "feishu_pending_source_upload";

function withQueryParam(path: string, key: string, value: string): string {
  const hashIndex = path.indexOf("#");
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const qIndex = base.indexOf("?");
  const pathname = qIndex >= 0 ? base.slice(0, qIndex) : base;
  const params = new URLSearchParams(qIndex >= 0 ? base.slice(qIndex + 1) : "");
  params.set(key, value);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

export function DocumentViewerPanel({
  vaultId,
  objectApiName,
  recordId,
  majorVersion = 0,
  minorVersion = 1,
  documentNumber,
  documentUploadRequest,
  onDocumentUploadComplete,
  onDocumentUploadHandled,
  documentActions,
  onDocumentAction,
  documentActionPending = false,
  viewerRefreshKey,
  onRecordPageReload,
  toolbarOnly = false,
  modalHostOnly = false,
  focusPageRequest = null,
}: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultDocumentViewerChrome, ...shell.document_viewer };
  const cancelLabel = displayText(shell.cancel);
  const [state, setState] = useState<DocumentViewerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feishuImporting, setFeishuImporting] = useState(false);
  const [feishuOpen, setFeishuOpen] = useState(false);
  const [sourceUploadOpen, setSourceUploadOpen] = useState(false);
  const [sourceUploadAutoFeishu, setSourceUploadAutoFeishu] = useState(false);
  const [sourceUploadContext, setSourceUploadContext] = useState<{
    action: SdkAction;
    target: DocumentUploadRequest["target"];
  } | null>(null);
  const [pages, setPages] = useState<LoadedPage[]>([]);
  const [pageHighlights, setPageHighlights] = useState<{
    page: number;
    boxes: Array<{ left_pct: number; top_pct: number; width_pct: number; height_pct: number }>;
  } | null>(null);
  const [highlightMissPage, setHighlightMissPage] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<
    Array<{
      id: string;
      kind: "note" | "anchor" | "line" | "document_link" | "permalink";
      page: number;
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      page_width: number;
      page_height: number;
      title: string;
      body: string;
      color: string;
      created_at?: string;
      resolved?: boolean;
      placement?: "placed" | "page_level";
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
      mentioned_user_ids?: string[];
      created_by?: string;
      created_by_name?: string;
      tags?: string[];
      replies?: Array<{
        id: string;
        annotation_id: string;
        body: string;
        mentioned_user_ids?: string[];
        created_at: string;
        created_by?: string;
        created_by_name?: string;
      }>;
    }>
  >([]);
  const [annotationTagCatalog, setAnnotationTagCatalog] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [annotateMeta, setAnnotateMeta] = useState<{
    page_width: number;
    page_height: number;
  } | null>(null);
  const [annotateTool, setAnnotateTool] = useState<AnnotateToolId>("select");
  const [annotateFlyoutOpen, setAnnotateFlyoutOpen] = useState(false);
  const [bringingForward, setBringingForward] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkConfirming, setLinkConfirming] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkCandidates, setLinkCandidates] = useState<
    Array<{
      record_id: string;
      document_number: string;
      name: string;
      major: number;
      minor: number;
    }>
  >([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [pendingLinkDraft, setPendingLinkDraft] = useState<{
    kind: "document_link" | "permalink";
    page: number;
    box: { x_min: number; y_min: number; x_max: number; y_max: number };
    page_width: number;
    page_height: number;
    selectedText: string;
    fromWords: boolean;
  } | null>(null);
  const [permalinkPageDraft, setPermalinkPageDraft] = useState("");
  const [selectedLinkTarget, setSelectedLinkTarget] = useState<{
    record_id: string;
    document_number: string;
    name: string;
    major: number;
    minor: number;
  } | null>(null);
  const [linkAnchors, setLinkAnchors] = useState<
    Array<{ id: string; page: number; title: string; body: string }>
  >([]);
  const [linkAnchorsLoading, setLinkAnchorsLoading] = useState(false);
  const [createAnchorMode, setCreateAnchorMode] = useState(() => isCreateAnchorMode());
  const [annotationsPanelOpen, setAnnotationsPanelOpen] = useState(false);
  const [annotationsFilterOpen, setAnnotationsFilterOpen] = useState(false);
  const [annotationFilters, setAnnotationFilters] = useState<AnnotateFilters>(() => defaultAnnotateFilters());
  const [hideAnnotations, setHideAnnotations] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editMentionIds, setEditMentionIds] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagDraft, setNewTagDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyMentionIds, setReplyMentionIds] = useState<string[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [drawDraft, setDrawDraft] = useState<(RelDraft & { page: number }) | null>(null);
  const [wordSelectPreview, setWordSelectPreview] = useState<{
    page: number;
    words: AnnotateWord[];
  } | null>(null);
  const drawActiveRef = useRef(false);
  const annotateFlyoutRef = useRef<HTMLDivElement>(null);
  const annotationFiltersRef = useRef<HTMLDivElement>(null);
  const pageWordsCacheRef = useRef<
    Map<number, { page_width: number; page_height: number; words: AnnotateWord[] }>
  >(new Map());
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const activeDocumentKeyRef = useRef<string | null>(null);
  const pendingUploadActionRef = useRef<{
    action: SdkAction;
    target: DocumentUploadRequest["target"];
  } | null>(null);
  const feishuResyncAfterOAuthRef = useRef(false);
  const createMode = !recordId?.trim();

  const mediaPlayback = state?.media_playback;
  const isPlayableSource =
    Boolean(state?.source?.media_type) &&
    /^(video|audio)\//i.test((state?.source?.media_type ?? "").split(";")[0]?.trim() ?? "");
  const effectiveMediaUrl = mediaPlayback?.url || mediaBlobUrl || null;
  const isMediaDoc = Boolean(effectiveMediaUrl);
  const previewReady = !isMediaDoc && !isPlayableSource && state?.rendition?.status === "ready";
  const pageCount = state?.rendition?.page_count ?? 0;
  const resolvedDocId = state?.document_number ?? documentNumber ?? recordId ?? "";
  const resolvedMajor = state?.major_version_number ?? majorVersion;
  const resolvedMinor = state?.minor_version_number ?? minorVersion;

  const clearPages = useCallback(() => {
    setPages((current) => {
      for (const entry of current) {
        URL.revokeObjectURL(entry.url);
      }
      return [];
    });
    loadedPagesRef.current = new Set();
    loadingPagesRef.current = new Set();
    setLoadingPage(null);
    setPageHighlights(null);
    setHighlightMissPage(null);
    setAnnotations([]);
    setAnnotationTagCatalog([]);
    setAnnotateMeta(null);
    setSelectedNoteId(null);
    setEditTitle("");
    setEditBody("");
    setEditMentionIds([]);
    setEditTags([]);
    setNewTagDraft("");
    setReplyDraft("");
    setReplyMentionIds([]);
    setAnnotateTool("select");
    setAnnotateFlyoutOpen(false);
    setAnnotationsPanelOpen(false);
    setAnnotationsFilterOpen(false);
    setAnnotationFilters(defaultAnnotateFilters());
    setHideAnnotations(false);
    setLinkPickerOpen(false);
    setLinkConfirming(false);
    setPendingLinkDraft(null);
    setLinkCandidates([]);
    setLinkSearch("");
    setSelectedLinkTarget(null);
    setLinkAnchors([]);
    setPermalinkPageDraft("");
    setDrawDraft(null);
    setWordSelectPreview(null);
    drawActiveRef.current = false;
    pageWordsCacheRef.current = new Map();
  }, []);

  const loadAnnotations = useCallback(async () => {
    if (!previewReady || !resolvedDocId) {
      return;
    }
    try {
      const [notesRes, meta] = await Promise.all([
        api.loadDocumentNotes(vaultId, {
          docId: resolvedDocId,
          major: resolvedMajor,
          minor: resolvedMinor,
          objectApiName,
        }),
        api.getDocumentAnnotateMeta(vaultId, {
          docId: resolvedDocId,
          major: resolvedMajor,
          minor: resolvedMinor,
          objectApiName,
        }).catch(() => null),
      ]);
      setAnnotations(notesRes.notes ?? []);
      const focusId = new URLSearchParams(window.location.search).get("focusAnnotation");
      if (focusId) {
        const found = (notesRes.notes ?? []).find((n) => n.id === focusId);
        if (found) {
          setSelectedNoteId(found.id);
          setEditTitle(found.title);
          setEditBody(found.body);
          setEditMentionIds([...(found.mentioned_user_ids ?? [])]);
          setEditTags([...(found.tags ?? [])]);
          setReplyMentionIds([]);
          setAnnotationsPanelOpen(true);
          window.setTimeout(() => {
            const el = canvasRef.current?.querySelector(
              `.document-viewer__page-wrap[data-page="${found.page}"]`,
            );
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 250);
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("focusAnnotation");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
      setAnnotationTagCatalog(
        (notesRes.tags ?? []).map((name) => ({ id: name, name })).sort((a, b) => a.name.localeCompare(b.name)),
      );
      if (meta && meta.page_width > 0 && meta.page_height > 0) {
        setAnnotateMeta({ page_width: meta.page_width, page_height: meta.page_height });
      }
    } catch {
      // Annotation overlay is best-effort; preview still works.
    }
  }, [
    previewReady,
    resolvedDocId,
    resolvedMajor,
    resolvedMinor,
    objectApiName,
    vaultId,
  ]);

  useEffect(() => {
    if (toolbarOnly || modalHostOnly || !previewReady) {
      return;
    }
    void loadAnnotations();
  }, [toolbarOnly, modalHostOnly, previewReady, loadAnnotations, viewerRefreshKey]);

  useEffect(() => {
    if (!createAnchorMode || toolbarOnly || modalHostOnly || !previewReady) {
      return;
    }
    setAnnotateTool("anchor");
    setAnnotateFlyoutOpen(false);
  }, [createAnchorMode, toolbarOnly, modalHostOnly, previewReady]);

  useEffect(() => {
    if (!annotateFlyoutOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = annotateFlyoutRef.current;
      if (root && !root.contains(event.target as Node)) {
        setAnnotateFlyoutOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAnnotateFlyoutOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [annotateFlyoutOpen]);

  useEffect(() => {
    if (!annotationsFilterOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (annotationFiltersRef.current?.contains(target)) {
        return;
      }
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest?.('[data-testid="annotation-filters-toggle"]')) {
        return;
      }
      setAnnotationsFilterOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAnnotationsFilterOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [annotationsFilterOpen]);

  const annotationFacets = useMemo(() => buildAnnotateFacets(annotations), [annotations]);
  const filteredAnnotations = useMemo(
    () => sortAnnotationsForNavigation(filterAnnotations(annotations, annotationFilters)),
    [annotations, annotationFilters],
  );
  const linkedDocuments = useMemo(() => buildLinkedDocuments(annotations), [annotations]);
  const selectedNote = useMemo(
    () => annotations.find((n) => n.id === selectedNoteId) ?? null,
    [annotations, selectedNoteId],
  );
  const annotationNavPos = useMemo(
    () => annotationNavIndex(filteredAnnotations, selectedNoteId),
    [filteredAnnotations, selectedNoteId],
  );
  const annotationDirty = useMemo(() => {
    if (!selectedNote) {
      return false;
    }
    return (
      editTitle !== selectedNote.title ||
      editBody !== selectedNote.body ||
      !sameStringList(editTags, selectedNote.tags ?? []) ||
      !sameStringList(editMentionIds, selectedNote.mentioned_user_ids ?? [])
    );
  }, [selectedNote, editTitle, editBody, editTags, editMentionIds]);
  const filtersActive = annotateFiltersActive(annotationFilters);
  const visibleAnnotations = hideAnnotations ? [] : filteredAnnotations;

  function annotationKindLabel(kind: string): string {
    switch (kind) {
      case "note":
        return displayText(chrome.annotations_type_note);
      case "anchor":
        return displayText(chrome.annotations_type_anchor);
      case "line":
        return displayText(chrome.annotations_type_line);
      case "document_link":
        return displayText(chrome.annotations_type_document_link);
      case "permalink":
        return displayText(chrome.annotations_type_permalink);
      default:
        return kind;
    }
  }

  function annotationStyle(note: (typeof annotations)[number]): CSSProperties {
    const pw = note.page_width > 0 ? note.page_width : annotateMeta?.page_width ?? 0;
    const ph = note.page_height > 0 ? note.page_height : annotateMeta?.page_height ?? 0;
    if (pw <= 0 || ph <= 0) {
      return { display: "none" };
    }
    if (note.kind === "line") {
      const left = Math.min(note.x_min, note.x_max);
      const top = Math.min(note.y_min, note.y_max);
      const width = Math.max(Math.abs(note.x_max - note.x_min), 1);
      const height = Math.max(Math.abs(note.y_max - note.y_min), 1);
      return {
        left: `${(left / pw) * 100}%`,
        top: `${(top / ph) * 100}%`,
        width: `${(width / pw) * 100}%`,
        height: `${(height / ph) * 100}%`,
      };
    }
    return {
      left: `${(note.x_min / pw) * 100}%`,
      top: `${(note.y_min / ph) * 100}%`,
      width: `${((note.x_max - note.x_min) / pw) * 100}%`,
      height: `${((note.y_max - note.y_min) / ph) * 100}%`,
    };
  }

  function lineLocalEndpoints(note: (typeof annotations)[number]): {
    x1: string;
    y1: string;
    x2: string;
    y2: string;
  } {
    const left = Math.min(note.x_min, note.x_max);
    const top = Math.min(note.y_min, note.y_max);
    const width = Math.max(Math.abs(note.x_max - note.x_min), 1);
    const height = Math.max(Math.abs(note.y_max - note.y_min), 1);
    return {
      x1: `${((note.x_min - left) / width) * 100}%`,
      y1: `${((note.y_min - top) / height) * 100}%`,
      x2: `${((note.x_max - left) / width) * 100}%`,
      y2: `${((note.y_max - top) / height) * 100}%`,
    };
  }

  function draftLineStyle(draft: NonNullable<typeof drawDraft>): {
    x1: string;
    y1: string;
    x2: string;
    y2: string;
  } {
    return {
      x1: `${draft.x0 * 100}%`,
      y1: `${draft.y0 * 100}%`,
      x2: `${draft.x1 * 100}%`,
      y2: `${draft.y1 * 100}%`,
    };
  }

  function frameRelPoint(frame: HTMLElement, clientX: number, clientY: number) {
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  function draftStyle(draft: NonNullable<typeof drawDraft>): CSSProperties {
    const left = Math.min(draft.x0, draft.x1) * 100;
    const top = Math.min(draft.y0, draft.y1) * 100;
    const width = Math.abs(draft.x1 - draft.x0) * 100;
    const height = Math.abs(draft.y1 - draft.y0) * 100;
    return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
  }

  function wordBoxStyle(
    word: AnnotateWord,
    pageWidth: number,
    pageHeight: number,
  ): CSSProperties {
    if (pageWidth <= 0 || pageHeight <= 0) {
      return { display: "none" };
    }
    return {
      left: `${(word.x_min / pageWidth) * 100}%`,
      top: `${(word.y_min / pageHeight) * 100}%`,
      width: `${((word.x_max - word.x_min) / pageWidth) * 100}%`,
      height: `${((word.y_max - word.y_min) / pageHeight) * 100}%`,
    };
  }

  const ensurePageWords = useCallback(
    async (pageNum: number) => {
      const cached = pageWordsCacheRef.current.get(pageNum);
      if (cached) {
        return cached;
      }
      if (!resolvedDocId) {
        return null;
      }
      try {
        const res = await api.loadDocumentPageWords(vaultId, {
          docId: resolvedDocId,
          major: resolvedMajor,
          minor: resolvedMinor,
          page: pageNum,
          objectApiName,
        });
        const entry = {
          page_width: res.page_width,
          page_height: res.page_height,
          words: res.words ?? [],
        };
        pageWordsCacheRef.current.set(pageNum, entry);
        if (entry.page_width > 0 && entry.page_height > 0) {
          setAnnotateMeta((cur) => cur ?? { page_width: entry.page_width, page_height: entry.page_height });
        }
        return entry;
      } catch {
        return null;
      }
    },
    [resolvedDocId, resolvedMajor, resolvedMinor, objectApiName, vaultId],
  );

  function updateWordSelectPreview(pageNum: number, draft: RelDraft) {
    const cached = pageWordsCacheRef.current.get(pageNum);
    if (!cached || cached.words.length === 0) {
      setWordSelectPreview(null);
      return;
    }
    const freeBox = {
      x_min: Math.min(draft.x0, draft.x1) * cached.page_width,
      y_min: Math.min(draft.y0, draft.y1) * cached.page_height,
      x_max: Math.max(draft.x0, draft.x1) * cached.page_width,
      y_max: Math.max(draft.y0, draft.y1) * cached.page_height,
    };
    const previewWords = wordsIntersectingRect(cached.words, freeBox);
    setWordSelectPreview(
      previewWords.length > 0 ? { page: pageNum, words: previewWords } : null,
    );
  }

  function handleAnnotatePointerDown(pageNum: number, event: MouseEvent<HTMLDivElement>) {
    if (annotateTool === "select" || !resolvedDocId) {
      return;
    }
    if ((event.target as HTMLElement).closest(".document-viewer__annotation")) {
      return;
    }
    const pt = frameRelPoint(event.currentTarget, event.clientX, event.clientY);
    if (!pt) {
      return;
    }
    event.preventDefault();
    drawActiveRef.current = true;
    setDrawDraft({ page: pageNum, x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });
    setWordSelectPreview(null);
    if (annotateTool !== "line") {
      void ensurePageWords(pageNum);
    }
  }

  function handleAnnotatePointerMove(pageNum: number, event: MouseEvent<HTMLDivElement>) {
    if (!drawActiveRef.current || !drawDraft || drawDraft.page !== pageNum) {
      return;
    }
    const pt = frameRelPoint(event.currentTarget, event.clientX, event.clientY);
    if (!pt) {
      return;
    }
    const next = { ...drawDraft, x1: pt.x, y1: pt.y };
    setDrawDraft(next);
    if (annotateTool !== "line") {
      updateWordSelectPreview(pageNum, next);
    }
  }

  async function handleAnnotatePointerUp(pageNum: number, event: MouseEvent<HTMLDivElement>) {
    if (!drawActiveRef.current || !drawDraft || drawDraft.page !== pageNum || !resolvedDocId) {
      drawActiveRef.current = false;
      return;
    }
    drawActiveRef.current = false;
    const pt = frameRelPoint(event.currentTarget, event.clientX, event.clientY);
    const x1 = pt?.x ?? drawDraft.x1;
    const y1 = pt?.y ?? drawDraft.y1;
    const draft = { ...drawDraft, x1, y1 };
    setDrawDraft(null);
    setWordSelectPreview(null);
    const relW = Math.abs(draft.x1 - draft.x0);
    const relH = Math.abs(draft.y1 - draft.y0);
    if (Math.hypot(relW, relH) < 0.01) {
      return;
    }
    const pageWords =
      annotateTool === "line" ? null : await ensurePageWords(pageNum);
    const pw = pageWords?.page_width || annotateMeta?.page_width || 595.32;
    const ph = pageWords?.page_height || annotateMeta?.page_height || 841.92;
    const kind =
      annotateTool === "anchor"
        ? "anchor"
        : annotateTool === "line"
          ? "line"
          : annotateTool === "document_link"
            ? "document_link"
            : annotateTool === "permalink"
              ? "permalink"
              : "note";
    let box = {
      x_min: Math.min(draft.x0, draft.x1) * pw,
      y_min: Math.min(draft.y0, draft.y1) * ph,
      x_max: Math.max(draft.x0, draft.x1) * pw,
      y_max: Math.max(draft.y0, draft.y1) * ph,
    };
    let selectedText = "";
    let fromWords = false;
    if (kind === "line") {
      box = {
        x_min: draft.x0 * pw,
        y_min: draft.y0 * ph,
        x_max: draft.x1 * pw,
        y_max: draft.y1 * ph,
      };
      fromWords = true;
    } else {
      const selection = resolveTextSelection(pageWords?.words ?? [], draft, pw, ph);
      box = selection.box;
      selectedText = selection.text.trim();
      fromWords = selection.fromWords;
    }
    const placement =
      kind === "line" ||
      kind === "document_link" ||
      kind === "permalink" ||
      fromWords
        ? "placed"
        : "page_level";
    if (kind === "document_link" || kind === "permalink") {
      setPendingLinkDraft({
        kind,
        page: pageNum,
        box,
        page_width: pw,
        page_height: ph,
        selectedText,
        fromWords,
      });
      setPermalinkPageDraft("");
      setLinkSearch("");
      setLinkCandidates([]);
      setLinkPickerOpen(true);
      return;
    }
    const defaultTitle =
      kind === "line"
        ? `Line p.${pageNum}`
        : selectedText.length > 0
          ? selectedText.length > 48
            ? `${selectedText.slice(0, 45)}…`
            : selectedText
          : kind === "anchor"
            ? `Anchor p.${pageNum}`
            : `Note p.${pageNum}`;
    // Create immediately with a sensible default title; open the side panel for editing
    // instead of blocking on window.prompt.
    const resolvedTitle =
      kind === "anchor" ? truncateAnchorTitle(defaultTitle) || defaultTitle : defaultTitle;
    try {
      const note = await api.createDocumentNote(vaultId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        object: objectApiName,
        kind,
        page: pageNum,
        x_min: box.x_min,
        y_min: box.y_min,
        x_max: box.x_max,
        y_max: box.y_max,
        page_width: pw,
        page_height: ph,
        title: resolvedTitle,
        body: selectedText,
        color: kind === "anchor" ? "blue" : kind === "line" ? "red" : "yellow",
        placement,
      });
      setAnnotations((cur) => [...cur, note]);
      setSelectedNoteId(note.id);
      setEditTitle(note.title);
      setEditBody(note.body);
      setEditMentionIds([...(note.mentioned_user_ids ?? [])]);
      setEditTags([...(note.tags ?? [])]);
      setNewTagDraft("");
      setReplyDraft("");
      setReplyMentionIds([]);
      setAnnotationsPanelOpen(true);
      if (createAnchorMode && kind === "anchor") {
        const payload = {
          type: ANCHOR_CREATED_MESSAGE,
          recordId: recordId ?? "",
          objectApiName,
          anchor: {
            id: note.id,
            page: note.page,
            title: note.title,
            body: note.body,
          },
        };
        if (recordId) {
          publishAnchorCreated(payload);
        }
        message.success(displayText(chrome.annotations_create_anchor_saved));
        setAnnotateTool("anchor");
      } else {
        setAnnotateTool("select");
      }
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_create)));
    }
  }

  async function searchLinkTargets(query: string) {
    setLinkSearching(true);
    try {
      const res = await api.searchAnnotationLinkTargets(vaultId, {
        objectApiName,
        q: query,
      });
      setLinkCandidates(res.candidates ?? []);
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_search)));
    } finally {
      setLinkSearching(false);
    }
  }

  async function reloadLinkAnchors(
    target: {
      record_id: string;
      document_number: string;
      name: string;
      major: number;
      minor: number;
    },
    prefer?: { id: string; page: number; title: string; body: string } | null,
  ) {
    setLinkAnchorsLoading(true);
    try {
      const res = await api.listDocumentAnchors(vaultId, {
        docId: target.document_number || target.record_id,
        major: target.major,
        minor: target.minor,
        objectApiName,
      });
      let next = (res.anchors ?? []).map((a) => ({
        id: a.id,
        page: a.page,
        title: a.title,
        body: a.body,
      }));
      if (prefer?.id && !next.some((a) => a.id === prefer.id)) {
        next = [prefer, ...next];
      } else if (prefer?.id) {
        next = [
          ...next.filter((a) => a.id === prefer.id),
          ...next.filter((a) => a.id !== prefer.id),
        ];
      }
      setLinkAnchors(next);
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_anchors)));
    } finally {
      setLinkAnchorsLoading(false);
    }
  }

  async function selectLinkDocument(target: {
    record_id: string;
    document_number: string;
    name: string;
    major: number;
    minor: number;
  }) {
    if (!pendingLinkDraft) {
      return;
    }
    if (pendingLinkDraft.kind === "permalink") {
      await confirmDocumentLink(target);
      return;
    }
    setSelectedLinkTarget(target);
    setLinkAnchors([]);
    await reloadLinkAnchors(target);
  }

  function openCreateAnchorMiniBrowser() {
    if (!selectedLinkTarget) {
      return;
    }
    openCreateAnchorWindow(objectApiName, selectedLinkTarget.record_id);
  }

  useEffect(() => {
    if (!linkPickerOpen || !selectedLinkTarget || pendingLinkDraft?.kind !== "document_link") {
      return;
    }
    const target = selectedLinkTarget;
    const unsubscribe = subscribeAnchorCreated((payload) => {
      if (payload.recordId !== target.record_id || payload.objectApiName !== objectApiName) {
        return;
      }
      void reloadLinkAnchors(target, payload.anchor);
    });
    const onFocus = () => {
      void reloadLinkAnchors(target);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [linkPickerOpen, selectedLinkTarget, pendingLinkDraft?.kind, objectApiName, vaultId]);

  function closeLinkPicker() {
    setLinkPickerOpen(false);
    setLinkConfirming(false);
    setPendingLinkDraft(null);
    setPermalinkPageDraft("");
    setSelectedLinkTarget(null);
    setLinkAnchors([]);
    setLinkCandidates([]);
    setLinkSearch("");
  }

  async function confirmDocumentLink(
    target: {
      record_id: string;
      document_number: string;
      name: string;
      major: number;
      minor: number;
    },
    anchor?: { id: string; title: string; page: number } | null,
  ) {
    if (!pendingLinkDraft || !resolvedDocId || linkConfirming) {
      return;
    }
    const draft = pendingLinkDraft;
    const isPermalink = draft.kind === "permalink";
    const pageNum = Number.parseInt(permalinkPageDraft.trim(), 10);
    const linkPage =
      isPermalink && Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : undefined;
    const title = isPermalink
      ? target.name.trim() || target.document_number
      : anchor
        ? anchor.title.trim() || `Anchor p.${anchor.page}`
        : target.name.trim() ||
          `${target.document_number} (v${target.major}.${target.minor})`;
    setLinkConfirming(true);
    // Close immediately so success path never leaves the picker stuck open
    // (API latency / leave animation / a11y snapshot timing).
    setLinkPickerOpen(false);
    try {
      const note = await api.createDocumentNote(vaultId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        object: objectApiName,
        kind: draft.kind,
        page: draft.page,
        x_min: draft.box.x_min,
        y_min: draft.box.y_min,
        x_max: draft.box.x_max,
        y_max: draft.box.y_max,
        page_width: draft.page_width,
        page_height: draft.page_height,
        title,
        body: draft.selectedText,
        color: isPermalink ? "purple" : "blue",
        placement: draft.fromWords ? "placed" : "page_level",
        link_doc_number: target.document_number,
        link_major: isPermalink ? undefined : target.major,
        link_minor: isPermalink ? undefined : target.minor,
        link_record_id: target.record_id,
        link_name: target.name,
        link_page: linkPage,
        link_anchor_id: anchor?.id,
        link_anchor_title: anchor?.title,
      });
      setAnnotations((cur) => [...cur, note]);
      setSelectedNoteId(note.id);
      setEditTitle(note.title);
      setEditBody(note.body);
      setAnnotateTool("select");
      setPendingLinkDraft(null);
      setPermalinkPageDraft("");
      setSelectedLinkTarget(null);
      setLinkAnchors([]);
      setLinkCandidates([]);
      setLinkSearch("");
      setAnnotationsPanelOpen(true);
    } catch (e) {
      setPendingLinkDraft(draft);
      setSelectedLinkTarget(isPermalink ? null : target);
      setLinkPickerOpen(true);
      setError(
        annotateErrorMessage(
          e,
          displayText(
            isPermalink ? chrome.annotate_error_permalink : chrome.annotate_error_document_link,
          ),
        ),
      );
    } finally {
      setLinkConfirming(false);
    }
  }

  async function openLinkedAnnotation(note: {
    kind: string;
    link_doc_number?: string;
    link_record_id?: string;
    link_page?: number;
    link_anchor_id?: string;
  }) {
    if (note.kind === "document_link" && note.link_record_id) {
      const q = note.link_anchor_id
        ? `?focusAnnotation=${encodeURIComponent(note.link_anchor_id)}`
        : "";
      window.open(
        `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(note.link_record_id)}${q}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (note.kind === "permalink" && note.link_doc_number) {
      try {
        const latest = await api.resolvePermalinkTarget(vaultId, {
          objectApiName,
          docNumber: note.link_doc_number,
        });
        const url = `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(latest.record_id)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setError(annotateErrorMessage(e, displayText(chrome.annotate_error_resolve_permalink)));
      }
    }
  }

  function applyFocusAnnotation(noteId: string) {
    setSelectedNoteId(noteId);
    const note = annotations.find((n) => n.id === noteId);
    if (!note) {
      return;
    }
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditMentionIds([...(note.mentioned_user_ids ?? [])]);
    setEditTags([...(note.tags ?? [])]);
    setNewTagDraft("");
    setReplyDraft("");
    setReplyMentionIds([]);
    const el = canvasRef.current?.querySelector(
      `.document-viewer__page-wrap[data-page="${note.page}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const listItem = document.querySelector(
        `.document-viewer__notes-item[data-annotation-id="${CSS.escape(noteId)}"]`,
      );
      listItem?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  function navigateAnnotation(delta: 1 | -1) {
    const total = filteredAnnotations.length;
    if (total === 0) {
      return;
    }
    let nextIndex: number;
    if (annotationNavPos < 0) {
      nextIndex = delta > 0 ? 0 : total - 1;
    } else {
      nextIndex = annotationNavPos + delta;
    }
    if (nextIndex < 0 || nextIndex >= total) {
      return;
    }
    const target = filteredAnnotations[nextIndex];
    if (target) {
      focusAnnotation(target.id);
    }
  }

  function focusAnnotation(noteId: string) {
    if (noteId === selectedNoteId || !annotationDirty) {
      applyFocusAnnotation(noteId);
      return;
    }
    Modal.confirm({
      title: displayText(chrome.annotate_discard_title),
      content: displayText(chrome.annotate_discard_body),
      okText: displayText(chrome.annotate_discard),
      cancelText: displayText(chrome.annotate_keep_editing),
      okButtonProps: { danger: true },
      onOk: () => {
        applyFocusAnnotation(noteId);
      },
    });
  }

  async function handleSaveSelectedNote() {
    if (!selectedNoteId || !resolvedDocId) {
      return;
    }
    setSavingNote(true);
    try {
      const updated = await api.updateDocumentNote(vaultId, selectedNoteId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        objectApiName,
        title: editTitle,
        body: editBody,
        tags: editTags,
        mentioned_user_ids: editMentionIds,
      });
      setAnnotations((cur) =>
        cur.map((n) => (n.id === updated.id ? { ...n, ...updated, replies: n.replies } : n)),
      );
      for (const tag of editTags) {
        setAnnotationTagCatalog((cur) =>
          cur.some((t) => t.name.toLowerCase() === tag.toLowerCase())
            ? cur
            : [...cur, { id: tag, name: tag }].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      message.success(displayText(chrome.annotate_saved));
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_save)));
    } finally {
      setSavingNote(false);
    }
  }

  async function handleToggleResolveSelectedNote() {
    if (!selectedNoteId || !resolvedDocId) {
      return;
    }
    const note = annotations.find((n) => n.id === selectedNoteId);
    if (!note || note.kind !== "note") {
      return;
    }
    setSavingNote(true);
    try {
      const updated = await api.updateDocumentNote(vaultId, selectedNoteId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        objectApiName,
        title: note.title,
        body: note.body,
        color: note.color,
        resolved: !note.resolved,
      });
      setAnnotations((cur) =>
        cur.map((n) => (n.id === updated.id ? { ...n, ...updated, replies: n.replies } : n)),
      );
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_save)));
    } finally {
      setSavingNote(false);
    }
  }

  function handleDeleteSelectedNote() {
    if (!selectedNoteId || !resolvedDocId) {
      return;
    }
    Modal.confirm({
      title: displayText(chrome.annotate_delete_confirm_title),
      content: displayText(chrome.annotate_delete_confirm_body),
      okText: displayText(chrome.annotate_delete_action),
      cancelText: cancelLabel,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteDocumentNote(vaultId, selectedNoteId, {
            docId: resolvedDocId,
            major: resolvedMajor,
            minor: resolvedMinor,
            objectApiName,
          });
          setAnnotations((cur) => cur.filter((n) => n.id !== selectedNoteId));
          setSelectedNoteId(null);
          setEditTitle("");
          setEditBody("");
          setEditMentionIds([]);
          setEditTags([]);
          setNewTagDraft("");
          setReplyDraft("");
          setReplyMentionIds([]);
        } catch (e) {
          setError(annotateErrorMessage(e, displayText(chrome.annotate_error_delete)));
          throw e;
        }
      },
    });
  }

  async function handleCreateReply() {
    if (!selectedNoteId || !resolvedDocId || !replyDraft.trim()) {
      return;
    }
    setSavingNote(true);
    try {
      const reply = await api.createDocumentNoteReply(vaultId, selectedNoteId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        objectApiName,
        body: replyDraft.trim(),
        mentioned_user_ids: replyMentionIds,
      });
      setAnnotations((cur) =>
        cur.map((n) =>
          n.id === selectedNoteId ? { ...n, replies: [...(n.replies ?? []), reply] } : n,
        ),
      );
      setReplyDraft("");
      setReplyMentionIds([]);
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_reply)));
    } finally {
      setSavingNote(false);
    }
  }

  function handleDeleteReply(replyId: string) {
    if (!selectedNoteId || !resolvedDocId) {
      return;
    }
    Modal.confirm({
      title: displayText(chrome.annotate_delete_reply_confirm_title),
      content: displayText(chrome.annotate_delete_reply_confirm_body),
      okText: displayText(chrome.annotate_delete_action),
      cancelText: cancelLabel,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteDocumentNoteReply(vaultId, replyId, {
            docId: resolvedDocId,
            major: resolvedMajor,
            minor: resolvedMinor,
            objectApiName,
          });
          setAnnotations((cur) =>
            cur.map((n) =>
              n.id === selectedNoteId
                ? { ...n, replies: (n.replies ?? []).filter((r) => r.id !== replyId) }
                : n,
            ),
          );
        } catch (e) {
          setError(annotateErrorMessage(e, displayText(chrome.annotate_error_delete_reply)));
          throw e;
        }
      },
    });
  }

  async function handleBringForwardAnnotations() {
    if (!resolvedDocId) {
      return;
    }
    setBringingForward(true);
    try {
      const res = await api.bringForwardDocumentNotes(vaultId, {
        docId: resolvedDocId,
        major: resolvedMajor,
        minor: resolvedMinor,
        object: objectApiName,
      });
      if ((res.brought_count ?? 0) === 0) {
        message.info(displayText(chrome.annotate_bring_forward_none));
        return;
      }
      setAnnotations((cur) => [...cur, ...(res.notes ?? [])]);
      setAnnotationsPanelOpen(true);
      message.success(
        displayTextTemplate(chrome.annotate_bring_forward_done, {
          count: res.brought_count,
          major: res.source_major ?? "?",
          minor: res.source_minor ?? "?",
        }),
      );
    } catch (e) {
      setError(annotateErrorMessage(e, displayText(chrome.annotate_error_bring_forward)));
    } finally {
      setBringingForward(false);
    }
  }

  const loadViewerState = useCallback(async () => {
    if (createMode || !recordId) {
      return null;
    }
    const data = await api.getDocumentViewerState(vaultId, objectApiName, recordId);
    setState(data);
    setError(null);
    return data;
  }, [createMode, vaultId, objectApiName, recordId]);

  useEffect(() => {
    if (createMode) {
      setState(null);
      setError(null);
      activeDocumentKeyRef.current = null;
      clearPages();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadViewerState();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : displayText(chrome.load_viewer_failed));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createMode, loadViewerState, clearPages, viewerRefreshKey]);

  // Local/dev fallback: Bearer auth cannot be attached to <video src>, so fetch a blob URL
  // when CDN/presign media_playback is absent.
  useEffect(() => {
    if (toolbarOnly || modalHostOnly || createMode || !recordId || !isPlayableSource || mediaPlayback?.url) {
      setMediaBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const blob = await api.downloadDocumentSource(vaultId, objectApiName, recordId);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setMediaBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setMediaBlobUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    toolbarOnly,
    modalHostOnly,
    createMode,
    recordId,
    isPlayableSource,
    mediaPlayback?.url,
    vaultId,
    objectApiName,
  ]);

  const renditionPending =
    Boolean(state?.source) &&
    !isMediaDoc &&
    !isPlayableSource &&
    (state?.rendition?.status === "queued" ||
      state?.rendition?.status === "rendering" ||
      state?.rendition?.status === "missing");

  const mediaTranscodePending =
    isPlayableSource &&
    (state?.media_rendition?.status === "queued" ||
      state?.media_rendition?.status === "rendering" ||
      state?.media_rendition?.status === "missing");

  useEffect(() => {
    if (toolbarOnly || (!renditionPending && !mediaTranscodePending)) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadViewerState().catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [toolbarOnly, renditionPending, mediaTranscodePending, loadViewerState]);

  const loadPage = useCallback(
    async (pageNum: number, totalPages: number) => {
      if (!previewReady || !recordId || !resolvedDocId || pageNum < 1) {
        return;
      }
      if (totalPages > 0 && pageNum > totalPages) {
        return;
      }
      if (loadedPagesRef.current.has(pageNum) || loadingPagesRef.current.has(pageNum)) {
        return;
      }
      loadingPagesRef.current.add(pageNum);
      setLoadingPage(pageNum);
      try {
        const blob = await api.getDocumentPageImage(vaultId, {
          docId: resolvedDocId,
          major: resolvedMajor,
          minor: resolvedMinor,
          page: pageNum,
          objectApiName,
        });
        const objectUrl = URL.createObjectURL(blob);
        loadedPagesRef.current.add(pageNum);
        setPages((current) =>
          [...current, { page: pageNum, url: objectUrl }].sort((a, b) => a.page - b.page),
        );
        setError(null);
      } catch (e) {
        if (pageNum === 1) {
          setError(e instanceof Error ? e.message : displayText(chrome.load_preview_failed));
        }
      } finally {
        loadingPagesRef.current.delete(pageNum);
        setLoadingPage((current) => (current === pageNum ? null : current));
      }
    },
    [previewReady, recordId, resolvedDocId, vaultId, resolvedMajor, resolvedMinor, objectApiName],
  );

  useEffect(() => {
    if (toolbarOnly || modalHostOnly || !focusPageRequest || !previewReady) {
      return;
    }
    const pageNum = focusPageRequest.page;
    const query = focusPageRequest.query?.trim();
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await loadPage(pageNum, pageCount);
      if (cancelled) {
        return;
      }
      const tryScroll = (attemptsLeft: number) => {
        if (cancelled) {
          return;
        }
        const el = canvasRef.current?.querySelector(
          `.document-viewer__page-wrap[data-page="${pageNum}"]`,
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (attemptsLeft > 0) {
          window.requestAnimationFrame(() => tryScroll(attemptsLeft - 1));
        }
      };
      tryScroll(45);

      if (!query || !resolvedDocId) {
        if (!cancelled) {
          setPageHighlights(null);
          setHighlightMissPage(null);
        }
        return;
      }
      try {
        const pageWords = await ensurePageWords(pageNum);
        if (cancelled) {
          return;
        }
        if (!pageWords) {
          setPageHighlights(null);
          setHighlightMissPage(pageNum);
          return;
        }
        const boxes = matchPageQueryHighlightBoxes(
          pageWords.words,
          pageWords.page_width,
          pageWords.page_height,
          query,
        );
        setPageHighlights({
          page: pageNum,
          boxes,
        });
        setHighlightMissPage(boxes.length === 0 ? pageNum : null);
      } catch {
        if (!cancelled) {
          setPageHighlights(null);
          setHighlightMissPage(pageNum);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    focusPageRequest,
    toolbarOnly,
    modalHostOnly,
    previewReady,
    loadPage,
    pageCount,
    resolvedDocId,
    resolvedMajor,
    resolvedMinor,
    objectApiName,
    vaultId,
    ensurePageWords,
  ]);

  useEffect(() => {
    if (!pageHighlights?.boxes.length) {
      return;
    }
    let attempts = 24;
    const tryScroll = () => {
      const hl = canvasRef.current?.querySelector(".document-viewer__highlight");
      if (hl) {
        hl.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempts > 0) {
        attempts -= 1;
        window.requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();
  }, [pageHighlights]);

  useEffect(() => {
    if (toolbarOnly || !previewReady || !recordId || !resolvedDocId) {
      return;
    }
    const key = documentKey(recordId, resolvedDocId, resolvedMajor, resolvedMinor, objectApiName);
    if (activeDocumentKeyRef.current === key) {
      return;
    }
    activeDocumentKeyRef.current = key;
    clearPages();
    void loadPage(1, pageCount);
    return () => {
      if (activeDocumentKeyRef.current === key) {
        activeDocumentKeyRef.current = null;
      }
    };
  }, [
    toolbarOnly,
    previewReady,
    recordId,
    resolvedDocId,
    resolvedMajor,
    resolvedMinor,
    objectApiName,
    pageCount,
    clearPages,
    loadPage,
  ]);

  useEffect(() => {
    if (toolbarOnly || !previewReady || !canvasRef.current || !sentinelRef.current) {
      return;
    }
    const root = canvasRef.current;
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        const loadedMax =
          loadedPagesRef.current.size > 0 ? Math.max(...loadedPagesRef.current) : 0;
        const nextPage = loadedMax + 1;
        if (pageCount > 0 && nextPage > pageCount) {
          return;
        }
        if (loadingPagesRef.current.size > 0) {
          return;
        }
        void loadPage(nextPage, pageCount);
      },
      { root, rootMargin: "240px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [toolbarOnly, previewReady, pageCount, loadPage, pages.length]);

  const handleUpload = async (
    file: File,
    options?: { bumpVersion?: boolean; afterUpload?: () => Promise<void>; viaCheckin?: boolean },
  ) => {
    if (!recordId || uploading) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await api.uploadDocumentSource(vaultId, objectApiName, recordId, file, {
        bumpVersion: options?.bumpVersion,
        viaCheckin: options?.viaCheckin,
      });
      message.success(displayTextTemplate(chrome.uploaded_file, { name: file.name }));
      activeDocumentKeyRef.current = null;
      clearPages();
      await loadViewerState();
      if (options?.afterUpload) {
        await options.afterUpload();
      } else if (options?.bumpVersion) {
        await onRecordPageReload?.();
      }
    } catch (e) {
      const msg = uploadErrorMessage(e, displayText(chrome.upload_failed));
      setError(msg);
      message.error(msg);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!documentUploadRequest || uploading || createMode || sourceUploadOpen) {
      return;
    }
    const { action, target } = documentUploadRequest;
    onDocumentUploadHandled?.();
    pendingUploadActionRef.current = { action, target };
    setSourceUploadContext({ action, target });
    setSourceUploadAutoFeishu(false);
    setSourceUploadOpen(true);
  }, [documentUploadRequest, uploading, createMode, sourceUploadOpen, onDocumentUploadHandled]);

  const closeSourceUploadModal = useCallback(() => {
    if (uploading || feishuImporting) {
      return;
    }
    setSourceUploadOpen(false);
    setSourceUploadAutoFeishu(false);
    setSourceUploadContext(null);
    pendingUploadActionRef.current = null;
    sessionStorage.removeItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY);
  }, [uploading, feishuImporting]);

  const finishSourceUpload = useCallback(
    async (opts?: { bumpVersion?: boolean }) => {
      activeDocumentKeyRef.current = null;
      clearPages();
      await loadViewerState();
      const pending = pendingUploadActionRef.current;
      pendingUploadActionRef.current = null;
      setSourceUploadOpen(false);
      setSourceUploadAutoFeishu(false);
      setSourceUploadContext(null);
      sessionStorage.removeItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY);
      if (pending && onDocumentUploadComplete) {
        await onDocumentUploadComplete(pending.action, pending.target);
      } else if (opts?.bumpVersion) {
        await onRecordPageReload?.();
      }
    },
    [clearPages, loadViewerState, onDocumentUploadComplete, onRecordPageReload],
  );

  const handleSourceUploadConfirm = useCallback(
    async (selection: DocumentSourceSelection) => {
      if (!recordId?.trim()) {
        return;
      }
      const pending = pendingUploadActionRef.current;
      const bumpVersion = Boolean(pending) || Boolean(state?.source);
      const viaCheckin = viaCheckinUpload(state?.checkout, pending?.action.name);
      setUploading(true);
      setError(null);
      try {
        if (selection.kind === "local") {
          await api.uploadDocumentSource(vaultId, objectApiName, recordId, selection.file, {
            bumpVersion,
            viaCheckin,
          });
          message.success(displayTextTemplate(chrome.uploaded_file, { name: selection.file.name }));
        } else {
          setFeishuImporting(true);
          await api.importDocumentSourceFromFeishu(vaultId, objectApiName, recordId, {
            profile_id: state?.feishu_import?.profile_id,
            file_token: selection.file_token,
            file_type: selection.file_type,
            title: selection.title,
            url: selection.url,
            bump_version: bumpVersion,
            via_checkin: viaCheckin,
          });
          message.success(displayText(chrome.imported_from_feishu));
        }
        await finishSourceUpload({ bumpVersion });
      } catch (err) {
        const msg = uploadErrorMessage(err, displayText(chrome.upload_failed));
        setError(msg);
        message.error(msg);
        throw err;
      } finally {
        setUploading(false);
        setFeishuImporting(false);
      }
    },
    [
      recordId,
      state?.source,
      state?.checkout,
      state?.feishu_import?.profile_id,
      vaultId,
      objectApiName,
      finishSourceUpload,
    ],
  );

  const handleCreateDraftConfirm = useCallback(
    async (selection: DocumentCreateDraftSelection) => {
      const pending = pendingUploadActionRef.current;
      if (!pending || !recordId?.trim()) {
        return;
      }
      const copySource = selection.kind === "copy";
      setUploading(true);
      setError(null);
      try {
        await api.sdkAction(vaultId, objectApiName, recordId, {
          action: pending.action.name,
          action_guard: {
            schema_fingerprint: pending.target.page.schema_fingerprint,
            ui_fingerprint: pending.target.page.ui_fingerprint,
            record_version: pending.target.page.record_version,
          },
          layout: pending.target.page.selected_layout.api_name,
          pre_execution_inputs: { copy_source: copySource ? "true" : "false" },
        });
        if (!copySource) {
          if (selection.kind === "local") {
            await api.uploadDocumentSource(vaultId, objectApiName, recordId, selection.file, {
              bumpVersion: false,
            });
            message.success(displayTextTemplate(chrome.uploaded_file, { name: selection.file.name }));
          } else {
            setFeishuImporting(true);
            await api.importDocumentSourceFromFeishu(vaultId, objectApiName, recordId, {
              profile_id: state?.feishu_import?.profile_id,
              file_token: selection.file_token,
              file_type: selection.file_type,
              title: selection.title,
              url: selection.url,
              bump_version: false,
            });
            message.success(displayText(chrome.imported_from_feishu));
          }
        }
        await finishSourceUpload();
      } catch (err) {
        const msg = createDraftErrorMessage(err, displayText(chrome.create_draft_failed));
        setError(msg);
        message.error(msg);
        throw err;
      } finally {
        setUploading(false);
        setFeishuImporting(false);
      }
    },
    [
      recordId,
      vaultId,
      objectApiName,
      state?.feishu_import?.profile_id,
      finishSourceUpload,
    ],
  );

  const handleFeishuPicked = useCallback(
    async (file: { file_token: string; file_type: string; title: string; url: string }) => {
      if (!recordId?.trim()) {
        return;
      }
      setUploading(true);
      setFeishuImporting(true);
      try {
        const pending = pendingUploadActionRef.current;
        pendingUploadActionRef.current = null;
        const bumpVersion = Boolean(pending) || Boolean(state?.source);
        const viaCheckin = viaCheckinUpload(state?.checkout, pending?.action.name);
        await api.importDocumentSourceFromFeishu(vaultId, objectApiName, recordId, {
          profile_id: state?.feishu_import?.profile_id,
          file_token: file.file_token,
          file_type: file.file_type,
          title: file.title,
          url: file.url,
          bump_version: bumpVersion,
          via_checkin: viaCheckin,
        });
        message.success(displayText(chrome.imported_from_feishu));
        activeDocumentKeyRef.current = null;
        clearPages();
        await loadViewerState();
        if (pending && onDocumentUploadComplete) {
          await onDocumentUploadComplete(pending.action, pending.target);
        } else if (bumpVersion) {
          await onRecordPageReload?.();
        }
      } catch (err) {
        message.error(uploadErrorMessage(err, displayText(chrome.upload_failed)));
        throw err;
      } finally {
        setUploading(false);
        setFeishuImporting(false);
      }
    },
    [
      recordId,
      vaultId,
      objectApiName,
      state?.source,
      state?.checkout,
      state?.feishu_import?.profile_id,
      loadViewerState,
      onDocumentUploadComplete,
      onRecordPageReload,
      clearPages,
    ],
  );

  const runFeishuResync = useCallback(
    async (resync: NonNullable<ReturnType<typeof externalSourceResyncRequest>>, profileId?: string) => {
      if (!recordId?.trim()) {
        return;
      }
      setUploading(true);
      setFeishuImporting(true);
      setError(null);
      try {
        await api.importDocumentSourceFromFeishu(vaultId, objectApiName, recordId, {
          profile_id: profileId,
          file_token: resync.file_token,
          file_type: resync.file_type,
          title: resync.title,
          url: resync.url,
          bump_version: true,
          via_checkin: false,
        });
        message.success(displayText(chrome.synced_from_feishu));
        activeDocumentKeyRef.current = null;
        clearPages();
        await loadViewerState();
        await onRecordPageReload?.();
      } catch (err) {
        const msg = uploadErrorMessage(err, displayText(chrome.upload_failed));
        setError(msg);
        message.error(msg);
      } finally {
        setUploading(false);
        setFeishuImporting(false);
      }
    },
    [recordId, vaultId, objectApiName, loadViewerState, clearPages, onRecordPageReload],
  );

  const handleFeishuResync = useCallback(async () => {
    const resync = externalSourceResyncRequest(state?.source?.external_source, {
      syncFromProvider: displayText(chrome.sync_from_provider),
    });
    if (!recordId?.trim() || !resync) {
      return;
    }
    const importAvail = state?.feishu_import;
    if (!importAvail?.enabled) {
      message.error(displayText(chrome.feishu_not_enabled));
      return;
    }
    if (!importAvail.authorized) {
      sessionStorage.setItem(FEISHU_PENDING_RESYNC_KEY, "1");
      const returnPath = withQueryParam(
        `${window.location.pathname}${window.location.search}`,
        "feishu_resync",
        "1",
      );
      const { authorize_url } = await api.startFeishuImportOAuth(vaultId, {
        profile_id: resync.profile_id ?? importAvail.profile_id,
        return_path: returnPath,
      });
      window.location.href = authorize_url;
      return;
    }
    await runFeishuResync(resync, resync.profile_id ?? importAvail.profile_id);
  }, [recordId, state?.source?.external_source, state?.feishu_import, vaultId, runFeishuResync]);

  // After Feishu OAuth redirect, reopen the picker or resume a pending resync / source upload.
  useEffect(() => {
    if (createMode || uploading) {
      return;
    }
    const importAvail = state?.feishu_import;
    const checkout = state?.checkout;
    const viewContentOk =
      state !== null &&
      (state.can_view_content === true ||
        (state.can_view_content === undefined && Boolean(state.source)));
    const hasUploadPermission = state?.can_upload_source === true;
    if (!Boolean(importAvail?.enabled) || !viewContentOk || !hasUploadPermission) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("feishu_import") !== "ok") {
      return;
    }
    const shouldResync =
      params.get("feishu_resync") === "1" ||
      sessionStorage.getItem(FEISHU_PENDING_RESYNC_KEY) === "1";
    const pendingSourceUploadAction = sessionStorage.getItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY);
    if (shouldResync && !canUploadSourceOutsideCheckin(checkout)) {
      sessionStorage.removeItem(FEISHU_PENDING_RESYNC_KEY);
      return;
    }
    if (
      pendingSourceUploadAction &&
      isCheckinSourceUpload(pendingSourceUploadAction) &&
      !canUploadSourceViaCheckin(checkout)
    ) {
      sessionStorage.removeItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY);
      return;
    }
    if (
      !shouldResync &&
      !pendingSourceUploadAction &&
      !canUploadSourceOutsideCheckin(checkout)
    ) {
      return;
    }
    sessionStorage.removeItem(FEISHU_PENDING_RESYNC_KEY);
    params.delete("feishu_import");
    params.delete("feishu_import_error");
    params.delete("feishu_resync");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
    if (shouldResync) {
      sessionStorage.removeItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY);
      if (!feishuResyncAfterOAuthRef.current) {
        feishuResyncAfterOAuthRef.current = true;
        void (async () => {
          try {
            const fresh = await loadViewerState();
            const resync = externalSourceResyncRequest(fresh?.source?.external_source, {
              syncFromProvider: displayText(chrome.sync_from_provider),
            });
            if (resync) {
              await runFeishuResync(
                resync,
                resync.profile_id ?? fresh?.feishu_import?.profile_id,
              );
            }
          } finally {
            feishuResyncAfterOAuthRef.current = false;
          }
        })();
      }
      return;
    }
    if (pendingSourceUploadAction) {
      const action = findSdkAction(documentActions, pendingSourceUploadAction);
      if (action && recordId?.trim()) {
        const target: DocumentUploadRequest["target"] = {
          objectName: objectApiName,
          recordId,
          page: {
            sections: [],
            object_api_name: objectApiName,
            record_id: recordId,
          } as unknown as DocumentUploadRequest["target"]["page"],
        };
        pendingUploadActionRef.current = { action, target };
        setSourceUploadContext({ action, target });
      }
      setSourceUploadAutoFeishu(true);
      setSourceUploadOpen(true);
      return;
    }
    setFeishuOpen(true);
  }, [
    createMode,
    uploading,
    state,
    loadViewerState,
    runFeishuResync,
    documentActions,
    recordId,
    objectApiName,
  ]);

  const viewerToolbarActions = DOCUMENT_TOOLBAR_ACTION_NAMES.map((name) =>
    findSdkAction(documentActions, name),
  ).filter((action): action is SdkAction => Boolean(action));

  const openFilePicker = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const viewerReady = state !== null;
  const checkout = state?.checkout;
  const uploadOutsideCheckin = canUploadSourceOutsideCheckin(checkout);
  const checkinUploadAction =
    sourceUploadContext?.action.name ?? pendingUploadActionRef.current?.action.name;
  const sourceUploadViaCheckin = viaCheckinUpload(checkout, checkinUploadAction);
  const isCreateDraftModal = isDocumentCreateDraftAction(sourceUploadContext?.action.name ?? "");
  const canViewContent =
    state?.can_view_content === true ||
    (state?.can_view_content === undefined && Boolean(state?.source));
  const canUpload =
    viewerReady &&
    canViewContent &&
    state?.can_upload_source === true &&
    !state.source &&
    !uploading &&
    uploadOutsideCheckin;
  const feishuAvail: FeishuImportAvailability | null = state?.feishu_import ?? null;
  const externalEdit = externalSourceEditAction(state?.source?.external_source, {
    editInProvider: displayText(chrome.edit_in_provider),
  });
  const externalResync = externalSourceResyncRequest(state?.source?.external_source, {
    syncFromProvider: displayText(chrome.sync_from_provider),
  });
  const canFeishuImport =
    Boolean(feishuAvail?.enabled) &&
    viewerReady &&
    canViewContent &&
    state?.can_upload_source === true &&
    !uploading &&
    uploadOutsideCheckin;
  const canFeishuResync = Boolean(externalResync) && canFeishuImport && Boolean(state?.source);
  const sourceModalFeishuAvail =
    isCreateDraftModal || sourceUploadViaCheckin || uploadOutsideCheckin ? feishuAvail : null;
  const viewContentDenied = viewerReady && !canViewContent;

  const sourceUploadTitle = displayText(
    sourceUploadContext?.action.label,
    isCreateDraftModal
      ? displayText(chrome.create_draft)
      : sourceUploadContext?.action.name === "checkin__v"
        ? displayText(chrome.check_in)
        : displayText(chrome.upload_new_version),
  );
  const sourceUploadDocName = recordDisplayName(sourceUploadContext?.target.page, recordId);
  const sourceUploadStateLabel = isCreateDraftModal
    ? undefined
    : sourceUploadContext?.target.page.state_label
      ? displayText(
          sourceUploadContext.target.page.state_label,
          sourceUploadContext.target.page.state_api_name,
        )
      : sourceUploadContext?.target.page.state_api_name;
  const sourceUploadCurrentVersion = formatCurrentVersionLabel(
    state?.major_version_number ??
      sourceUploadContext?.target.page.document_header?.major_version_number,
    state?.minor_version_number ??
      sourceUploadContext?.target.page.document_header?.minor_version_number,
  );

  const showEmptyState = createMode || (viewerReady && canViewContent && !state.source);
  const loadedCount = pages.length;
  const hasMorePages = pageCount === 0 || loadedCount < pageCount;
  const showLoadingMore = previewReady && loadingPage !== null && hasMorePages;

  return (
    <div
      className={[
        "document-viewer",
        toolbarOnly ? "document-viewer--toolbar-only" : "",
        modalHostOnly ? "document-viewer--modal-host" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={
        modalHostOnly
          ? "document-action-modal-host"
          : toolbarOnly
            ? "document-actions-toolbar"
            : "document-viewer"
      }
      aria-hidden={modalHostOnly || undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="document-viewer__file-input"
        data-testid="document-source-upload-input"
        disabled={uploading || createMode || !canUpload}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) {
            return;
          }
          const pending = pendingUploadActionRef.current;
          pendingUploadActionRef.current = null;
          if (pending && onDocumentUploadComplete) {
            void handleUpload(file, {
              bumpVersion: true,
              viaCheckin: viaCheckinUpload(state?.checkout, pending.action.name),
              afterUpload: () => onDocumentUploadComplete(pending.action, pending.target),
            });
            return;
          }
          void handleUpload(file);
        }}
      />
      {!modalHostOnly ? (
      <>
      <div className="document-viewer__toolbar">
        {!toolbarOnly ? <span className="document-viewer__title">{displayText(chrome.title)}</span> : null}
        <div className="document-viewer__toolbar-actions">
          {state?.checkout?.locked ? (
            <span className="document-viewer__checkout-badge">
              {state.checkout.locked_by_me ? displayText(chrome.checked_out_by_you) : displayText(chrome.checked_out)}
            </span>
          ) : null}
          {viewerToolbarActions.length > 0 || externalEdit || (canFeishuResync && externalResync) || (canFeishuImport && state?.source && !externalResync) ? (
            <span className="document-viewer__icon-group" role="toolbar" aria-label="Document actions">
              {viewerToolbarActions.map((action) => {
                const label = displayText(action.label, action.name);
                return (
                  <ViewerIconButton
                    key={action.name}
                    title={label}
                    disabled={documentActionPending || uploading}
                    onClick={() => onDocumentAction?.(action)}
                  >
                    <DocumentActionGlyph name={action.name} />
                  </ViewerIconButton>
                );
              })}
              {externalEdit ? (
                <ViewerIconButton
                  title={externalEdit.label}
                  disabled={documentActionPending || uploading}
                  onClick={() => window.open(externalEdit.url, "_blank", "noopener,noreferrer")}
                >
                  <DocumentActionGlyph name="external_edit" />
                </ViewerIconButton>
              ) : null}
              {canFeishuResync && externalResync ? (
                <ViewerIconButton
                  title={externalResync.label}
                  loading={feishuImporting}
                  disabled={documentActionPending || uploading}
                  onClick={() => void handleFeishuResync()}
                >
                  <DocumentActionGlyph name="feishu_resync" />
                </ViewerIconButton>
              ) : null}
              {canFeishuImport && state?.source && !externalResync ? (
                <ViewerIconButton
                  title={displayText(chrome.import_from_feishu)}
                  loading={feishuImporting}
                  disabled={documentActionPending || uploading}
                  onClick={() => setFeishuOpen(true)}
                >
                  <DocumentActionGlyph name="feishu_import" />
                </ViewerIconButton>
              ) : null}
            </span>
          ) : null}
          {viewContentDenied ? (
            <span className="document-viewer__meta">{displayText(chrome.content_not_available)}</span>
          ) : !toolbarOnly && state?.source ? (
            <span className="document-viewer__meta">
              {state.source.file_name} ({formatByteLength(state.source.byte_length)})
              {pageCount > 0
                ? ` · ${displayTextTemplate(chrome.pages_count, { count: pageCount })}`
                : null}
            </span>
          ) : !toolbarOnly && viewerReady ? (
            <span className="document-viewer__meta">{displayText(chrome.no_source_file)}</span>
          ) : null}
        </div>
      </div>
      {!toolbarOnly ? (
      <div className="document-viewer__body">
        {error ? <div className="document-viewer__error">{error}</div> : null}
        {viewContentDenied ? (
          <div className="document-viewer__empty document-viewer__empty--disabled">
            <p className="document-viewer__empty-title">{displayText(chrome.content_not_available)}</p>
            <p className="document-viewer__empty-hint">
              {displayText(chrome.content_permission_denied)}
            </p>
          </div>
        ) : null}
        {feishuImporting && !showEmptyState ? (
          <div className="document-viewer__empty document-viewer__empty--disabled">
            <Spin size="large" />
            <p className="document-viewer__empty-title" style={{ marginTop: 16 }}>
              {externalResync
                ? displayText(chrome.syncing_from_feishu)
                : displayText(chrome.importing_from_feishu)}
            </p>
            <p className="document-viewer__empty-hint">
              {displayText(chrome.feishu_export_hint)}
            </p>
          </div>
        ) : null}
        {showEmptyState ? (
          <div
            className={[
              "document-viewer__empty",
              canUpload ? "document-viewer__empty--interactive" : "document-viewer__empty--disabled",
            ].join(" ")}
            data-testid="document-source-upload-button"
            onClick={canUpload ? openFilePicker : undefined}
            onKeyDown={
              canUpload
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFilePicker();
                    }
                  }
                : undefined
            }
            role={canUpload ? "button" : undefined}
            tabIndex={canUpload ? 0 : undefined}
          >
            <p className="document-viewer__empty-title">
              {createMode
                ? displayText(chrome.save_to_upload)
                : uploading
                  ? feishuImporting
                    ? displayText(chrome.importing_from_feishu)
                    : displayText(chrome.uploading)
                  : canUpload
                    ? displayText(chrome.upload_source_file)
                    : displayText(chrome.no_source_file)}
            </p>
            <p className="document-viewer__empty-hint">
              {createMode
                ? displayText(chrome.save_to_upload_hint)
                : uploading && feishuImporting
                  ? externalResync
                    ? displayText(chrome.feishu_resync_hint)
                    : displayText(chrome.feishu_export_hint)
                  : canUpload
                    ? displayText(chrome.upload_source_hint)
                    : displayText(chrome.no_source_hint)}
            </p>
            {canUpload || canFeishuImport ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {canUpload ? (
                  <Button
                    type="primary"
                    loading={uploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    {displayText(chrome.browse_files)}
                  </Button>
                ) : null}
                {canFeishuImport ? (
                  <Button
                    loading={uploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeishuOpen(true);
                    }}
                  >
                    {displayText(chrome.import_from_feishu)}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {isMediaDoc && effectiveMediaUrl && !feishuImporting ? (
          <DocumentMediaPlayer
            src={effectiveMediaUrl}
            kind={mediaPlayerKind(mediaPlayback, state?.source?.media_type)}
            withCredentials={Boolean(mediaPlayback?.with_credentials)}
            posterUrl={mediaPlayback?.poster_url}
            playbackRateLabel={chrome.media_playback_rate}
          />
        ) : null}
        {isPlayableSource && mediaTranscodePending && !isMediaDoc && !feishuImporting && !showEmptyState ? (
          <div className="document-viewer__status">{displayText(chrome.media_transcoding)}</div>
        ) : null}
        {isPlayableSource &&
        state?.media_rendition?.status === "failed" &&
        !isMediaDoc &&
        !feishuImporting &&
        !showEmptyState ? (
          <div className="document-viewer__error">
            {state.media_rendition.error_message ?? displayText(chrome.media_transcode_failed)}
          </div>
        ) : null}
        {isPlayableSource &&
        !isMediaDoc &&
        !mediaTranscodePending &&
        state?.media_rendition?.status !== "failed" &&
        !feishuImporting &&
        !showEmptyState ? (
          <div className="document-viewer__status">{displayText(chrome.media_playback_unavailable)}</div>
        ) : null}
        {!isMediaDoc && !isPlayableSource && (state?.rendition?.status === "queued" || state?.rendition?.status === "rendering") ? (
          <div className="document-viewer__status">{displayText(chrome.generating_viewable)}</div>
        ) : null}
        {!isMediaDoc && !isPlayableSource && state?.rendition?.status === "failed" ? (
          <div className="document-viewer__error">{state.rendition.error_message ?? displayText(chrome.rendition_failed)}</div>
        ) : null}
        {!isMediaDoc && !isPlayableSource && state?.rendition?.status === "not_applicable" ? (
          <div className="document-viewer__status">{displayText(chrome.preview_not_available)}</div>
        ) : null}
        {previewReady && loadedCount === 0 && loadingPage === 1 ? (
          <div className="document-viewer__status">Loading preview…</div>
        ) : null}
        {highlightMissPage != null ? (
          <div className="document-viewer__status" role="status">
            {displayTextTemplate(chrome.highlight_not_found, { page: highlightMissPage })}
          </div>
        ) : null}
        {loadedCount > 0 && !feishuImporting ? (
          <div className="document-viewer__annotate-layout">
          <div
            className="document-viewer__tool-rail"
            role="toolbar"
            aria-label={displayText(chrome.annotate_tools)}
            data-testid="document-annotate-tool-rail"
          >
            <ViewerIconButton
              title={displayText(chrome.annotate_select)}
              pressed={annotateTool === "select"}
              onClick={() => {
                setAnnotateTool("select");
                setAnnotateFlyoutOpen(false);
                setDrawDraft(null);
              }}
            >
              <AnnotateGlyph name="select" />
            </ViewerIconButton>
            <div className="document-viewer__tool-rail-annotate" ref={annotateFlyoutRef}>
              <ViewerIconButton
                title={displayText(chrome.annotate_menu)}
                pressed={isAnnotatePlaceTool(annotateTool) || annotateFlyoutOpen}
                ariaLabel={displayText(chrome.annotate_menu)}
                onClick={() => setAnnotateFlyoutOpen((open) => !open)}
              >
                <CommentOutlined data-testid="document-annotate-menu" />
              </ViewerIconButton>
              {annotateFlyoutOpen ? (
                <div
                  className="document-viewer__annotate-flyout"
                  role="menu"
                  aria-label={displayText(chrome.annotate_menu)}
                  data-testid="document-annotate-flyout"
                >
                  {ANNOTATE_PLACE_TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={annotateTool === tool.id}
                      className={[
                        "document-viewer__annotate-flyout-item",
                        annotateTool === tool.id ? "document-viewer__annotate-flyout-item--active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setAnnotateTool(tool.id);
                        setAnnotateFlyoutOpen(false);
                      }}
                    >
                      <AnnotateGlyph name={tool.id} />
                      <span>{displayText(chrome[tool.labelKey])}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {selectedNoteId ? (
              <ViewerIconButton
                title={displayText(chrome.annotate_delete)}
                danger
                onClick={() => void handleDeleteSelectedNote()}
              >
                <AnnotateGlyph name="delete" />
              </ViewerIconButton>
            ) : null}
            <span className="document-viewer__tool-rail-sep" aria-hidden />
            <ViewerIconButton
              title={displayText(chrome.annotate_bring_forward)}
              loading={bringingForward}
              disabled={bringingForward || !resolvedDocId}
              onClick={() => void handleBringForwardAnnotations()}
            >
              <RetweetOutlined data-testid="document-annotate-bring-forward" />
            </ViewerIconButton>
            <ViewerIconButton
              title={displayText(chrome.view_annotations)}
              pressed={annotationsPanelOpen}
              onClick={() => setAnnotationsPanelOpen((open) => !open)}
              ariaLabel={displayText(chrome.view_annotations)}
            >
              <UnorderedListOutlined data-testid="document-annotations-toggle" />
            </ViewerIconButton>
          </div>
          {createAnchorMode ? (
            <div
              className="document-viewer__create-anchor-banner"
              data-testid="document-create-anchor-banner"
              role="status"
            >
              {displayText(chrome.annotations_create_anchor_banner)}
            </div>
          ) : null}
          <div ref={canvasRef} className="document-viewer__canvas">
            <div className="document-viewer__pages">
              {pages.map((entry) => (
                <figure
                  key={entry.page}
                  data-page={entry.page}
                  className="document-viewer__page-wrap"
                >
                  <div
                    className={[
                      "document-viewer__page-frame",
                      annotateTool !== "select" ? "document-viewer__page-frame--placing" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseDown={(e) => handleAnnotatePointerDown(entry.page, e)}
                    onMouseMove={(e) => handleAnnotatePointerMove(entry.page, e)}
                    onMouseUp={(e) => void handleAnnotatePointerUp(entry.page, e)}
                    onMouseLeave={(e) => {
                      if (drawActiveRef.current && drawDraft?.page === entry.page) {
                        void handleAnnotatePointerUp(entry.page, e);
                      }
                    }}
                  >
                    <img src={entry.url} alt={`Page ${entry.page}`} className="document-viewer__page" draggable={false} />
                    {pageHighlights?.page === entry.page
                      ? pageHighlights.boxes.map((box, idx) => (
                          <span
                            key={`${entry.page}-${idx}`}
                            className="document-viewer__highlight"
                            style={{
                              left: `${box.left_pct}%`,
                              top: `${box.top_pct}%`,
                              width: `${box.width_pct}%`,
                              height: `${box.height_pct}%`,
                            }}
                          />
                        ))
                      : null}
                    {wordSelectPreview?.page === entry.page
                      ? wordSelectPreview.words.map((word, idx) => (
                          <span
                            key={`word-sel-${entry.page}-${idx}`}
                            className="document-viewer__word-select"
                            style={wordBoxStyle(
                              word,
                              pageWordsCacheRef.current.get(entry.page)?.page_width ||
                                annotateMeta?.page_width ||
                                1,
                              pageWordsCacheRef.current.get(entry.page)?.page_height ||
                                annotateMeta?.page_height ||
                                1,
                            )}
                          />
                        ))
                      : null}
                    {visibleAnnotations
                      .filter((n) => n.page === entry.page)
                      .map((note) =>
                        note.kind === "line" ? (
                          <button
                            key={note.id}
                            type="button"
                            className={[
                              "document-viewer__annotation",
                              "document-viewer__annotation--line",
                              note.resolved ? "document-viewer__annotation--resolved" : "",
                              selectedNoteId === note.id ? "document-viewer__annotation--selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={annotationStyle(note)}
                            title={note.title || "line"}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              focusAnnotation(note.id);
                            }}
                          >
                            {(() => {
                              const ep = lineLocalEndpoints(note);
                              return (
                                <svg className="document-viewer__line-svg" aria-hidden>
                                  <line
                                    x1={ep.x1}
                                    y1={ep.y1}
                                    x2={ep.x2}
                                    y2={ep.y2}
                                    className="document-viewer__line-stroke"
                                  />
                                </svg>
                              );
                            })()}
                          </button>
                        ) : (
                          <button
                            key={note.id}
                            type="button"
                            className={[
                              "document-viewer__annotation",
                              note.kind === "anchor"
                                ? "document-viewer__annotation--anchor"
                                : note.kind === "document_link"
                                  ? "document-viewer__annotation--document-link"
                                  : note.kind === "permalink"
                                    ? "document-viewer__annotation--permalink"
                                    : "document-viewer__annotation--note",
                              note.resolved ? "document-viewer__annotation--resolved" : "",
                              selectedNoteId === note.id ? "document-viewer__annotation--selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={annotationStyle(note)}
                            title={
                              note.kind === "document_link" || note.kind === "permalink"
                                ? note.link_name || note.link_doc_number || note.title
                                : note.title || note.body || note.kind
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              focusAnnotation(note.id);
                              if (note.kind === "document_link" || note.kind === "permalink") {
                                void openLinkedAnnotation(note);
                              }
                            }}
                          />
                        ),
                      )}
                    {drawDraft?.page === entry.page ? (
                      annotateTool === "line" ? (
                        <svg className="document-viewer__draw-draft-line" aria-hidden>
                          <line
                            {...draftLineStyle(drawDraft)}
                            className="document-viewer__line-stroke document-viewer__line-stroke--draft"
                          />
                        </svg>
                      ) : (
                        <span
                          className={[
                            "document-viewer__draw-draft",
                            annotateTool === "anchor"
                              ? "document-viewer__draw-draft--anchor"
                              : "document-viewer__draw-draft--note",
                          ].join(" ")}
                          style={draftStyle(drawDraft)}
                        />
                      )
                    ) : null}
                  </div>
                  <figcaption className="document-viewer__page-label">Page {entry.page}</figcaption>
                </figure>
              ))}
            </div>
            {hasMorePages ? <div ref={sentinelRef} className="document-viewer__sentinel" aria-hidden /> : null}
            {showLoadingMore ? (
              <div className="document-viewer__status">
                {pageCount > 0
                  ? displayTextTemplate(chrome.loading_page_of, { page: loadingPage ?? "", total: pageCount })
                  : displayTextTemplate(chrome.loading_page, { page: loadingPage ?? "" })}
              </div>
            ) : null}
          </div>
          {annotationsPanelOpen ? (
          <aside
            className="document-viewer__notes-panel"
            aria-label={displayText(chrome.view_annotations)}
            data-testid="document-annotations-panel"
          >
            <div className="document-viewer__notes-panel-title">
              <span>
                {displayTextTemplate(chrome.annotations_title, {
                  count: filtersActive ? filteredAnnotations.length : annotations.length,
                })}
              </span>
              <span className="document-viewer__notes-panel-actions">
                <button
                  type="button"
                  className={[
                    "document-viewer__notes-panel-close",
                    hideAnnotations ? "document-viewer__notes-panel-close--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={
                    hideAnnotations
                      ? displayText(chrome.annotations_show)
                      : displayText(chrome.annotations_hide)
                  }
                  aria-pressed={hideAnnotations}
                  title={
                    hideAnnotations
                      ? displayText(chrome.annotations_show)
                      : displayText(chrome.annotations_hide)
                  }
                  data-testid="annotation-hide-toggle"
                  onClick={() => setHideAnnotations((hidden) => !hidden)}
                >
                  {hideAnnotations ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
                <button
                  type="button"
                  className={[
                    "document-viewer__notes-panel-close",
                    annotationsFilterOpen || filtersActive
                      ? "document-viewer__notes-panel-close--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={displayText(chrome.annotations_filters)}
                  aria-pressed={annotationsFilterOpen}
                  data-testid="annotation-filters-toggle"
                  onClick={() => setAnnotationsFilterOpen((open) => !open)}
                >
                  <FilterOutlined />
                </button>
                <button
                  type="button"
                  className="document-viewer__notes-panel-close"
                  aria-label={displayText(chrome.close_annotations)}
                  onClick={() => setAnnotationsPanelOpen(false)}
                >
                  <CloseOutlined />
                </button>
              </span>
            </div>
            {filteredAnnotations.length > 0 ? (
              <div className="document-viewer__notes-nav" data-testid="annotation-nav">
                <span className="document-viewer__notes-nav-position" data-testid="annotation-nav-position">
                  {displayTextTemplate(chrome.annotations_nav_position, {
                    current: annotationNavPos >= 0 ? String(annotationNavPos + 1) : "—",
                    total: String(filteredAnnotations.length),
                  })}
                </span>
                <span className="document-viewer__notes-nav-actions">
                  <button
                    type="button"
                    className="document-viewer__notes-nav-btn"
                    aria-label={displayText(chrome.annotations_previous)}
                    title={displayText(chrome.annotations_previous)}
                    data-testid="annotation-nav-prev"
                    disabled={filteredAnnotations.length === 0 || annotationNavPos === 0}
                    onClick={() => navigateAnnotation(-1)}
                  >
                    <UpOutlined />
                  </button>
                  <button
                    type="button"
                    className="document-viewer__notes-nav-btn"
                    aria-label={displayText(chrome.annotations_next)}
                    title={displayText(chrome.annotations_next)}
                    data-testid="annotation-nav-next"
                    disabled={
                      filteredAnnotations.length === 0 ||
                      annotationNavPos === filteredAnnotations.length - 1
                    }
                    onClick={() => navigateAnnotation(1)}
                  >
                    <DownOutlined />
                  </button>
                </span>
              </div>
            ) : null}
            {annotationsFilterOpen ? (
              <div
                ref={annotationFiltersRef}
                className="document-viewer__notes-filters document-viewer__notes-filters--floating"
                role="dialog"
                aria-label={displayText(chrome.annotations_filters)}
                data-testid="annotation-filters"
              >
                <div className="document-viewer__notes-filters-header">
                  <span>{displayText(chrome.annotations_filters)}</span>
                  <button
                    type="button"
                    className="document-viewer__notes-filters-reset"
                    onClick={() => {
                      setAnnotationFilters(defaultAnnotateFilters());
                      setHideAnnotations(false);
                    }}
                  >
                    {displayText(chrome.annotations_filters_reset)}
                  </button>
                </div>
                <label className="document-viewer__notes-filters-toggle">
                  <input
                    type="checkbox"
                    checked={hideAnnotations}
                    onChange={(e) => setHideAnnotations(e.target.checked)}
                  />
                  <span>{displayText(chrome.annotations_hide)}</span>
                </label>
                <label className="document-viewer__notes-filters-search">
                  <span className="visually-hidden">{displayText(chrome.annotations_filter_keyword)}</span>
                  <input
                    type="search"
                    value={annotationFilters.keyword}
                    placeholder={displayText(chrome.annotations_filter_keyword)}
                    data-testid="annotation-filter-keyword"
                    onChange={(e) =>
                      setAnnotationFilters((cur) => ({ ...cur, keyword: e.target.value }))
                    }
                  />
                </label>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_notes)} ({annotationFacets.noteStatus.all})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.noteStatus.all],
                      ["open", chrome.annotations_filter_open, annotationFacets.noteStatus.open],
                      [
                        "resolved",
                        chrome.annotations_filter_resolved,
                        annotationFacets.noteStatus.resolved,
                      ],
                      ["none", chrome.annotations_filter_none, 0],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-note-status"
                        checked={annotationFilters.noteStatus === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            noteStatus: value as AnnotateNoteStatusFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)}
                        {value === "none" ? "" : ` (${count})`}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_placement)} (
                    {annotationFacets.placements.all})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.placements.all],
                      ["placed", chrome.annotations_filter_placed, annotationFacets.placements.placed],
                      [
                        "page_level",
                        chrome.annotations_filter_page_level,
                        annotationFacets.placements.page_level,
                      ],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-placement"
                        checked={annotationFilters.placement === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            placement: value as AnnotatePlacementFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)} ({count})
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_created)} (
                    {annotationFacets.created.all})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.created.all],
                      [
                        "today",
                        chrome.annotations_filter_created_today,
                        annotationFacets.created.today,
                      ],
                      [
                        "last_7_days",
                        chrome.annotations_filter_created_7d,
                        annotationFacets.created.last_7_days,
                      ],
                      [
                        "last_30_days",
                        chrome.annotations_filter_created_30d,
                        annotationFacets.created.last_30_days,
                      ],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-created"
                        checked={annotationFilters.created === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            created: value as AnnotateCreatedFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)} ({count})
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_type)} ({annotationFacets.kinds.all})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.kinds.all],
                      ["note", chrome.annotations_type_note, annotationFacets.kinds.note],
                      ["anchor", chrome.annotations_type_anchor, annotationFacets.kinds.anchor],
                      ["line", chrome.annotations_type_line, annotationFacets.kinds.line],
                      [
                        "document_link",
                        chrome.annotations_type_document_link,
                        annotationFacets.kinds.document_link,
                      ],
                      [
                        "permalink",
                        chrome.annotations_type_permalink,
                        annotationFacets.kinds.permalink,
                      ],
                      ["none", chrome.annotations_filter_none, 0],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-kind"
                        checked={annotationFilters.kind === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            kind: value as AnnotateKindFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)}
                        {value === "none" ? "" : ` (${count})`}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_links)} (
                    {annotationFacets.links.document_link +
                      annotationFacets.links.permalink +
                      annotationFacets.links.anchor})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.links.all],
                      [
                        "document_link",
                        chrome.annotations_type_document_link,
                        annotationFacets.links.document_link,
                      ],
                      [
                        "permalink",
                        chrome.annotations_type_permalink,
                        annotationFacets.links.permalink,
                      ],
                      [
                        "anchor",
                        chrome.annotations_filter_link_anchor,
                        annotationFacets.links.anchor,
                      ],
                      ["none", chrome.annotations_filter_none, 0],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-links"
                        checked={annotationFilters.linkKind === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            linkKind: value as AnnotateLinkFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)}
                        {value === "none" ? "" : ` (${count})`}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_author)} ({annotationFacets.authors.length})
                  </legend>
                  <label className="document-viewer__notes-filters-option">
                    <input
                      type="checkbox"
                      checked={annotationFilters.authors.size === 0}
                      onChange={() =>
                        setAnnotationFilters((cur) => ({ ...cur, authors: new Set() }))
                      }
                    />
                    <span>
                      {displayText(chrome.annotations_filter_all)} ({annotationFacets.kinds.all})
                    </span>
                  </label>
                  {annotationFacets.authors.map((author) => {
                    const checked =
                      annotationFilters.authors.size === 0 ||
                      annotationFilters.authors.has(author.id);
                    return (
                      <label key={author.id} className="document-viewer__notes-filters-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAnnotationFilters((cur) => {
                              const next = new Set(
                                cur.authors.size === 0
                                  ? annotationFacets.authors.map((a) => a.id)
                                  : cur.authors,
                              );
                              if (e.target.checked) {
                                next.add(author.id);
                              } else {
                                next.delete(author.id);
                              }
                              if (next.size === 0 || next.size === annotationFacets.authors.length) {
                                return { ...cur, authors: new Set() };
                              }
                              return { ...cur, authors: next };
                            });
                          }}
                        />
                        <span>
                          {author.label} ({author.count})
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_tags)} ({annotationFacets.tags.length})
                  </legend>
                  <label className="document-viewer__notes-filters-option">
                    <input
                      type="checkbox"
                      checked={annotationFilters.tags.size === 0}
                      onChange={() =>
                        setAnnotationFilters((cur) => ({ ...cur, tags: new Set() }))
                      }
                    />
                    <span>
                      {displayText(chrome.annotations_filter_all)} ({annotationFacets.kinds.all})
                    </span>
                  </label>
                  {annotationFacets.tags.map((tag) => {
                    const checked =
                      annotationFilters.tags.size === 0 || annotationFilters.tags.has(tag.id);
                    return (
                      <label key={tag.id} className="document-viewer__notes-filters-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAnnotationFilters((cur) => {
                              const next = new Set(
                                cur.tags.size === 0
                                  ? annotationFacets.tags.map((t) => t.id)
                                  : cur.tags,
                              );
                              if (e.target.checked) {
                                next.add(tag.id);
                              } else {
                                next.delete(tag.id);
                              }
                              if (next.size === 0 || next.size === annotationFacets.tags.length) {
                                return { ...cur, tags: new Set() };
                              }
                              return { ...cur, tags: next };
                            });
                          }}
                        />
                        <span>
                          {tag.label} ({tag.count})
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <fieldset className="document-viewer__notes-filters-group">
                  <legend>
                    {displayText(chrome.annotations_filter_version)} ({annotationFacets.versions.all})
                  </legend>
                  {(
                    [
                      ["all", chrome.annotations_filter_all, annotationFacets.versions.all],
                      ["this", chrome.annotations_version_this, annotationFacets.versions.this],
                      [
                        "previous",
                        chrome.annotations_version_previous,
                        annotationFacets.versions.previous,
                      ],
                    ] as const
                  ).map(([value, label, count]) => (
                    <label key={value} className="document-viewer__notes-filters-option">
                      <input
                        type="radio"
                        name="annotation-filter-version"
                        checked={annotationFilters.version === value}
                        onChange={() =>
                          setAnnotationFilters((cur) => ({
                            ...cur,
                            version: value as AnnotateVersionFilter,
                          }))
                        }
                      />
                      <span>
                        {displayText(label)} ({count})
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}
            <div className="document-viewer__notes-panel-scroll">
            <div
              className="document-viewer__linked-docs"
              data-testid="document-linked-documents"
            >
              <div className="document-viewer__linked-docs-header">
                <span>
                  {displayText(chrome.annotations_linked_documents)}
                  {linkedDocuments.length > 0 ? ` (${linkedDocuments.length})` : ""}
                </span>
                <button
                  type="button"
                  className="document-viewer__linked-docs-add"
                  title={displayText(chrome.annotations_linked_add)}
                  aria-label={displayText(chrome.annotations_linked_add)}
                  data-testid="document-linked-documents-add"
                  onClick={() => {
                    setAnnotateTool("document_link");
                    setAnnotateFlyoutOpen(false);
                  }}
                >
                  +
                </button>
              </div>
              {linkedDocuments.length === 0 ? (
                <p className="document-viewer__notes-empty">
                  {displayText(chrome.annotations_linked_documents_empty)}
                </p>
              ) : (
                <ul className="document-viewer__linked-docs-list">
                  {linkedDocuments.map((entry) => (
                    <li key={entry.key} className="document-viewer__linked-docs-item">
                      <button
                        type="button"
                        className="document-viewer__linked-docs-main"
                        onClick={() => {
                          const first = entry.annotation_ids[0];
                          if (first) {
                            focusAnnotation(first);
                          }
                        }}
                        title={displayText(chrome.annotations_linked_focus)}
                      >
                        <span
                          className={[
                            "document-viewer__linked-docs-icon",
                            entry.in_use
                              ? "document-viewer__linked-docs-icon--in-use"
                              : "document-viewer__linked-docs-icon--idle",
                          ].join(" ")}
                          aria-hidden
                        >
                          {entry.target_kind === "anchor" ? (
                            <PaperClipOutlined />
                          ) : (
                            <FileTextOutlined />
                          )}
                        </span>
                        <span className="document-viewer__linked-docs-title">
                          {entry.target_name || entry.target_doc_number}
                          {entry.link_anchor_title ? ` › ${entry.link_anchor_title}` : ""}
                        </span>
                        <span className="document-viewer__linked-docs-meta">
                          {entry.target_doc_number}
                          {entry.target_major != null && entry.target_minor != null
                            ? ` · v${entry.target_major}.${entry.target_minor}`
                            : ""}
                        </span>
                      </button>
                      <span className="document-viewer__linked-docs-actions">
                        <button
                          type="button"
                          className="document-viewer__linked-docs-action"
                          title={displayText(chrome.annotations_linked_view_target)}
                          aria-label={displayText(chrome.annotations_linked_view_target)}
                          onClick={() => {
                            const note = annotations.find((n) => n.id === entry.annotation_ids[0]);
                            if (note) {
                              void openLinkedAnnotation(note);
                            }
                          }}
                        >
                          <LinkOutlined />
                        </button>
                        <button
                          type="button"
                          className="document-viewer__linked-docs-action"
                          disabled={entry.in_use}
                          title={displayText(chrome.annotations_linked_remove_blocked)}
                          aria-label={displayText(chrome.annotations_linked_remove_blocked)}
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {annotations.length === 0 ? (
              <p className="document-viewer__notes-empty">
                {displayText(chrome.annotate_empty_hint)}
              </p>
            ) : filteredAnnotations.length === 0 ? (
              <p className="document-viewer__notes-empty">
                {displayText(chrome.annotations_filtered_empty)}
              </p>
            ) : (
              <ul className="document-viewer__notes-list">
                {filteredAnnotations.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      className={[
                        "document-viewer__notes-item",
                        selectedNoteId === note.id ? "document-viewer__notes-item--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-annotation-id={note.id}
                      onClick={() => focusAnnotation(note.id)}
                    >
                      <span className="document-viewer__notes-item-kind">
                        {annotationKindLabel(note.kind)}
                        {note.kind === "note" && note.resolved
                          ? ` · ${displayText(chrome.annotate_resolved_badge)}`
                          : ""}
                        {note.brought_forward && note.source_major != null && note.source_minor != null
                          ? ` · v${note.source_major}.${note.source_minor}`
                          : ""}
                        {note.kind === "document_link" && note.link_doc_number
                          ? ` · ${note.link_doc_number}${note.link_anchor_title ? ` › ${note.link_anchor_title}` : ""}`
                          : note.kind === "permalink" && note.link_doc_number
                            ? ` · ${note.link_doc_number}${note.link_page != null ? ` p.${note.link_page}` : ""}`
                            : ""}
                      </span>
                      <span className="document-viewer__notes-item-title">
                        {note.title ||
                          displayTextTemplate(chrome.annotate_untitled, {
                            page: String(note.page),
                          })}
                      </span>
                      <span className="document-viewer__notes-item-page">
                        {displayTextTemplate(chrome.annotate_page_label, {
                          page: String(note.page),
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedNoteId ? (
              <div className="document-viewer__notes-editor">
                <label className="document-viewer__notes-field">
                  <span>{displayText(chrome.annotate_title)}</span>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    data-testid="annotation-title-input"
                  />
                </label>
                <label className="document-viewer__notes-field">
                  <span>{displayText(chrome.annotate_body)}</span>
                  <AnnotationMentionField
                    vaultId={vaultId}
                    value={editBody}
                    mentionedUserIds={editMentionIds}
                    rows={4}
                    placeholder={displayText(chrome.annotate_mention_hint)}
                    emptyLabel={displayText(chrome.annotate_mention_empty)}
                    loadingLabel={displayText(chrome.annotate_mention_loading)}
                    testId="annotation-body-input"
                    onChange={({ text, mentionedUserIds }) => {
                      setEditBody(text);
                      setEditMentionIds(mentionedUserIds);
                    }}
                  />
                </label>
                <div className="document-viewer__notes-tags" data-testid="annotation-tags-editor">
                  <div className="document-viewer__notes-replies-title">
                    {displayText(chrome.annotate_tags)}
                  </div>
                  <div className="document-viewer__notes-tags-options">
                    {Array.from(
                      new Set([
                        ...annotationTagCatalog.map((t) => t.name),
                        ...editTags,
                        ...annotationFacets.tags.map((t) => t.label),
                      ]),
                    )
                      .sort((a, b) => a.localeCompare(b))
                      .map((tag) => {
                        const checked = editTags.includes(tag);
                        return (
                          <label key={tag} className="document-viewer__notes-filters-option">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setEditTags((cur) =>
                                  e.target.checked
                                    ? [...cur, tag]
                                    : cur.filter((t) => t !== tag),
                                );
                              }}
                            />
                            <span>{tag}</span>
                          </label>
                        );
                      })}
                  </div>
                  <div className="document-viewer__notes-tags-add">
                    <input
                      value={newTagDraft}
                      maxLength={49}
                      placeholder={displayText(chrome.annotate_tags_placeholder)}
                      data-testid="annotation-tag-input"
                      onChange={(e) => setNewTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const name = newTagDraft.trim();
                          if (!name) {
                            return;
                          }
                          setEditTags((cur) =>
                            cur.some((t) => t.toLowerCase() === name.toLowerCase())
                              ? cur
                              : [...cur, name],
                          );
                          setAnnotationTagCatalog((cur) =>
                            cur.some((t) => t.name.toLowerCase() === name.toLowerCase())
                              ? cur
                              : [...cur, { id: name, name }].sort((a, b) =>
                                  a.name.localeCompare(b.name),
                                ),
                          );
                          setNewTagDraft("");
                        }
                      }}
                    />
                    <Button
                      size="small"
                      data-testid="annotation-tag-add"
                      onClick={() => {
                        const name = newTagDraft.trim();
                        if (!name) {
                          return;
                        }
                        setEditTags((cur) =>
                          cur.some((t) => t.toLowerCase() === name.toLowerCase())
                            ? cur
                            : [...cur, name],
                        );
                        setAnnotationTagCatalog((cur) =>
                          cur.some((t) => t.name.toLowerCase() === name.toLowerCase())
                            ? cur
                            : [...cur, { id: name, name }].sort((a, b) =>
                                a.name.localeCompare(b.name),
                              ),
                        );
                        setNewTagDraft("");
                      }}
                    >
                      {displayText(chrome.annotate_tags_add)}
                    </Button>
                  </div>
                </div>
                <div className="document-viewer__notes-editor-actions">
                  <Button
                    size="small"
                    type="primary"
                    loading={savingNote}
                    disabled={!annotationDirty}
                    onClick={() => void handleSaveSelectedNote()}
                  >
                    {displayText(chrome.annotate_save)}
                  </Button>
                  {annotationDirty ? (
                    <span className="document-viewer__notes-empty" data-testid="annotation-unsaved">
                      {displayText(chrome.annotate_unsaved)}
                    </span>
                  ) : null}
                  {selectedNote?.kind === "note" ? (
                    <Button
                      size="small"
                      loading={savingNote}
                      data-testid="annotation-resolve-toggle"
                      onClick={() => void handleToggleResolveSelectedNote()}
                    >
                      {selectedNote.resolved
                        ? displayText(chrome.annotate_reopen)
                        : displayText(chrome.annotate_resolve)}
                    </Button>
                  ) : null}
                  <Button size="small" danger onClick={() => handleDeleteSelectedNote()}>
                    {displayText(chrome.annotate_delete_action)}
                  </Button>
                </div>
                <div className="document-viewer__notes-replies" data-testid="annotation-replies">
                  <div className="document-viewer__notes-replies-title">
                    {displayText(chrome.annotate_replies_heading)}
                  </div>
                  {(selectedNote?.replies ?? []).length === 0 ? (
                    <p className="document-viewer__notes-empty">
                      {displayText(chrome.annotate_reply_empty)}
                    </p>
                  ) : (
                    <ul className="document-viewer__notes-replies-list">
                      {(selectedNote?.replies ?? []).map((reply) => (
                          <li key={reply.id} className="document-viewer__notes-reply">
                            <div className="document-viewer__notes-reply-meta">
                              <span>{reply.created_by_name || "User"}</span>
                              <Button
                                size="small"
                                type="text"
                                danger
                                aria-label={displayText(chrome.annotate_delete_reply_confirm_title)}
                                onClick={() => handleDeleteReply(reply.id)}
                              >
                                <DeleteOutlined />
                              </Button>
                            </div>
                            <p>{reply.body}</p>
                          </li>
                        ))}
                    </ul>
                  )}
                  <label className="document-viewer__notes-field">
                    <span className="visually-hidden">{displayText(chrome.annotate_reply)}</span>
                    <AnnotationMentionField
                      vaultId={vaultId}
                      value={replyDraft}
                      mentionedUserIds={replyMentionIds}
                      rows={2}
                      placeholder={displayText(chrome.annotate_reply_placeholder)}
                      emptyLabel={displayText(chrome.annotate_mention_empty)}
                      loadingLabel={displayText(chrome.annotate_mention_loading)}
                      testId="annotation-reply-input"
                      onChange={({ text, mentionedUserIds }) => {
                        setReplyDraft(text);
                        setReplyMentionIds(mentionedUserIds);
                      }}
                    />
                  </label>
                  <Button
                    size="small"
                    type="primary"
                    loading={savingNote}
                    disabled={!replyDraft.trim()}
                    data-testid="annotation-reply-submit"
                    onClick={() => void handleCreateReply()}
                  >
                    {displayText(chrome.annotate_reply)}
                  </Button>
                </div>
              </div>
            ) : null}
            </div>
          </aside>
          ) : null}
          </div>
        ) : null}
      </div>
      ) : null}
      </>
      ) : null}
      <DocumentSourceUploadModal
        open={sourceUploadOpen}
        title={sourceUploadTitle}
        documentName={sourceUploadDocName}
        stateLabel={sourceUploadStateLabel}
        currentVersionLabel={sourceUploadCurrentVersion}
        vaultId={vaultId}
        feishuAvailability={sourceModalFeishuAvail}
        submitting={uploading}
        variant={isCreateDraftModal ? "create_draft" : "source_upload"}
        confirmLabel={
          isCreateDraftModal
            ? displayText(chrome.create)
            : sourceUploadContext?.action.name === "checkin__v"
              ? displayText(chrome.check_in)
              : displayText(chrome.upload)
        }
        autoOpenFeishu={sourceUploadAutoFeishu}
        onFeishuPickerOpen={() => {
          const actionName = pendingUploadActionRef.current?.action.name;
          if (actionName) {
            sessionStorage.setItem(FEISHU_PENDING_SOURCE_UPLOAD_KEY, actionName);
          }
        }}
        onCancel={closeSourceUploadModal}
        onConfirm={handleSourceUploadConfirm}
        onCreateDraftConfirm={handleCreateDraftConfirm}
      />
      <Modal
        open={linkPickerOpen}
        title={displayText(
          pendingLinkDraft?.kind === "permalink"
            ? chrome.annotations_permalink_picker_title
            : selectedLinkTarget
              ? chrome.annotations_select_anchors
              : chrome.annotations_link_picker_title,
        )}
        onCancel={closeLinkPicker}
        footer={null}
        destroyOnHidden
        confirmLoading={linkConfirming}
        data-testid="annotation-link-picker"
      >
        {selectedLinkTarget && pendingLinkDraft?.kind === "document_link" ? (
          <div data-testid="annotation-select-anchors">
            <p className="document-viewer__notes-empty" style={{ marginBottom: 12 }}>
              {selectedLinkTarget.name || selectedLinkTarget.document_number} (v
              {selectedLinkTarget.major}.{selectedLinkTarget.minor})
            </p>
            <Button
              size="small"
              style={{ marginBottom: 12 }}
              disabled={linkConfirming}
              onClick={() => {
                setSelectedLinkTarget(null);
                setLinkAnchors([]);
              }}
            >
              ← {displayText(chrome.annotations_link_picker_title)}
            </Button>
            <Button
              size="small"
              type="default"
              style={{ marginBottom: 12, marginLeft: 8 }}
              disabled={linkConfirming}
              data-testid="annotation-create-new-anchor"
              onClick={openCreateAnchorMiniBrowser}
            >
              {displayText(chrome.annotations_create_new_anchor)}
            </Button>
            <ul className="document-viewer__notes-list">
              <li>
                <button
                  type="button"
                  className="document-viewer__notes-item"
                  data-testid="annotation-link-whole-document"
                  disabled={linkConfirming}
                  onClick={() => void confirmDocumentLink(selectedLinkTarget)}
                >
                  <span className="document-viewer__notes-item-kind">
                    {displayText(chrome.annotate_link_kind_document)}
                  </span>
                  <span className="document-viewer__notes-item-title">
                    {displayText(chrome.annotations_link_whole_document)}
                  </span>
                </button>
              </li>
              {linkAnchorsLoading ? (
                <li>
                  <p className="document-viewer__notes-empty">{displayText(chrome.annotate_loading)}</p>
                </li>
              ) : linkAnchors.length === 0 ? (
                <li>
                  <p className="document-viewer__notes-empty">
                    {displayText(chrome.annotations_link_anchors_empty)}
                  </p>
                </li>
              ) : (
                linkAnchors.map((anchor) => (
                  <li key={anchor.id}>
                    <button
                      type="button"
                      className="document-viewer__notes-item"
                      disabled={linkConfirming}
                      onClick={() =>
                        void confirmDocumentLink(selectedLinkTarget, {
                          id: anchor.id,
                          title: anchor.title,
                          page: anchor.page,
                        })
                      }
                    >
                      <span className="document-viewer__notes-item-kind">
                        {displayText(chrome.annotate_link_kind_anchor)}
                      </span>
                      <span className="document-viewer__notes-item-title">
                        {anchor.title ||
                          displayTextTemplate(chrome.annotate_untitled, {
                            page: String(anchor.page),
                          })}
                      </span>
                      <span className="document-viewer__notes-item-page">
                        {displayTextTemplate(chrome.annotate_page_label, {
                          page: String(anchor.page),
                        })}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <>
            <Input.Search
              allowClear
              value={linkSearch}
              placeholder={displayText(chrome.annotations_link_picker_search)}
              loading={linkSearching}
              onChange={(e) => setLinkSearch(e.target.value)}
              onSearch={(value) => void searchLinkTargets(value)}
              enterButton={displayText(chrome.search)}
              style={{ marginBottom: 12 }}
            />
            {pendingLinkDraft?.kind === "permalink" ? (
              <label
                className="document-viewer__notes-field"
                style={{ display: "block", marginBottom: 12 }}
              >
                <span>{displayText(chrome.annotations_permalink_page)}</span>
                <input
                  type="number"
                  min={1}
                  value={permalinkPageDraft}
                  data-testid="annotation-permalink-page"
                  onChange={(e) => setPermalinkPageDraft(e.target.value)}
                />
              </label>
            ) : null}
            {linkCandidates.length === 0 ? (
              <p className="document-viewer__notes-empty">
                {displayText(chrome.annotations_link_picker_empty)}
              </p>
            ) : (
              <ul className="document-viewer__notes-list">
                {linkCandidates.map((candidate) => (
                  <li key={candidate.record_id}>
                    <button
                      type="button"
                      className="document-viewer__notes-item"
                      onClick={() => void selectLinkDocument(candidate)}
                    >
                      <span className="document-viewer__notes-item-kind">
                        v{candidate.major}.{candidate.minor}
                      </span>
                      <span className="document-viewer__notes-item-title">
                        {candidate.name || candidate.document_number}
                      </span>
                      <span className="document-viewer__notes-item-page">
                        {candidate.document_number}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>
      <FeishuImportModal
        open={feishuOpen}
        vaultId={vaultId}
        availability={feishuAvail}
        onClose={() => setFeishuOpen(false)}
        onPicked={handleFeishuPicked}
      />
    </div>
  );
}
