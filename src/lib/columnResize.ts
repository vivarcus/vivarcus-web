import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_COLUMN_WIDTH = 56;
export const MAX_COLUMN_WIDTH = 2400;
export const DEFAULT_RECORD_LINK_COLUMN_WIDTH = 220;
export const DEFAULT_COLUMN_WIDTH_MIN = 96;
export const DEFAULT_COLUMN_WIDTH_MAX = 280;

function clampColumnWidth(width: number): number {
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.round(width)));
}

/** Sensible default width when the user has not saved a column preference. */
export function defaultListColumnWidth(
  label: string,
  options?: { recordLink?: boolean; filterable?: boolean },
): number {
  if (options?.recordLink) {
    return DEFAULT_RECORD_LINK_COLUMN_WIDTH;
  }
  let units = 0;
  for (const ch of label) {
    // CJK and other wide glyphs need roughly a full em; Latin is narrower.
    units += (ch.codePointAt(0) ?? 0) > 0xff ? 1 : 0.55;
  }
  const textPx = Math.ceil(units * 13);
  const chromePx = 40 + (options?.filterable ? 22 : 0);
  return Math.max(DEFAULT_COLUMN_WIDTH_MIN, Math.min(DEFAULT_COLUMN_WIDTH_MAX, textPx + chromePx));
}

function serializeColumnWidths(widths: Record<string, number> | undefined): string {
  if (!widths || Object.keys(widths).length === 0) {
    return "";
  }
  return JSON.stringify(
    Object.entries(widths).sort(([left], [right]) => left.localeCompare(right)),
  );
}

type DragState = {
  field: string;
  tableRoot: HTMLElement;
  startX: number;
  startWidth: number;
  pendingWidth: number;
  rafId: number | null;
};

export function measureHeaderColumnWidths(headerRow: HTMLTableRowElement): Record<string, number> {
  const widths: Record<string, number> = {};
  headerRow.querySelectorAll<HTMLElement>("th[data-column-field]").forEach((th) => {
    const field = th.getAttribute("data-column-field");
    if (!field) return;
    const width = Math.round(th.getBoundingClientRect().width);
    if (width > 0) {
      widths[field] = width;
    }
  });
  return widths;
}

export function readColumnPixelWidth(th: HTMLTableCellElement): number {
  const measured = Math.round(th.getBoundingClientRect().width);
  return measured > 0 ? measured : 160;
}

export type ColumnWidthChangeHandler = (fieldApiName: string, width: number) => void;

export function useColumnWidths(
  columnWidths: Record<string, number> | undefined,
  onColumnWidthChange?: ColumnWidthChangeHandler,
) {
  const [widths, setWidths] = useState<Record<string, number>>(columnWidths ?? {});
  const widthsRef = useRef(widths);
  const dragRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const onColumnWidthChangeRef = useRef(onColumnWidthChange);
  const externalWidthsKey = serializeColumnWidths(columnWidths);

  onColumnWidthChangeRef.current = onColumnWidthChange;

  useEffect(() => {
    if (dragRef.current) {
      return;
    }
    setWidths(columnWidths ?? {});
  }, [externalWidthsKey]);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  const beginResize = useCallback(
    (
      fieldApiName: string,
      startX: number,
      startWidth: number,
      tableRoot: HTMLElement,
      _baselineWidths: Record<string, number>,
    ) => {
      // Only lock the column being resized. Spreading every measured header width
      // forces tableLayout fixed with a content-sized total and creates a second
      // scrollbar on the list page.
      const merged = {
        ...widthsRef.current,
        [fieldApiName]: startWidth,
      };
      widthsRef.current = merged;
      setWidths(merged);
      dragRef.current = {
        field: fieldApiName,
        tableRoot,
        startX,
        startWidth,
        pendingWidth: startWidth,
        rafId: null,
      };
      isDraggingRef.current = true;
      tableRoot.classList.add("table-wrap--resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    function scheduleWidthPaint(drag: DragState) {
      if (drag.rafId != null) {
        return;
      }
      drag.rafId = requestAnimationFrame(() => {
        drag.rafId = null;
        setWidths((prev) => ({ ...prev, [drag.field]: drag.pendingWidth }));
      });
    }

    function onPointerMove(event: MouseEvent | PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const nextWidth = clampColumnWidth(drag.startWidth + (event.clientX - drag.startX));
      if (nextWidth === drag.pendingWidth) {
        return;
      }
      drag.pendingWidth = nextWidth;
      widthsRef.current = { ...widthsRef.current, [drag.field]: nextWidth };
      scheduleWidthPaint(drag);
    }

    function onPointerUp() {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.rafId != null) {
        cancelAnimationFrame(drag.rafId);
        drag.rafId = null;
      }
      dragRef.current = null;
      isDraggingRef.current = false;
      drag.tableRoot.classList.remove("table-wrap--resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const width = drag.pendingWidth;
      setWidths((prev) => {
        const next = { ...prev, [drag.field]: width };
        widthsRef.current = next;
        return next;
      });
      onColumnWidthChangeRef.current?.(drag.field, width);
    }

    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    return () => {
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      const drag = dragRef.current;
      if (drag?.rafId != null) {
        cancelAnimationFrame(drag.rafId);
      }
      dragRef.current = null;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return { widths, beginResize, isDraggingRef };
}
