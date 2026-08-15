/** PDF-point word box from /ui/annotate/loadWords. */
export type AnnotateWord = {
  text: string;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
};

export type PdfRect = {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
};

export type RelDraft = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** Convert a page-relative drag draft (0–1) into PDF-point rect. */
export function relDraftToPdf(draft: RelDraft, pageWidth: number, pageHeight: number): PdfRect {
  return {
    x_min: Math.min(draft.x0, draft.x1) * pageWidth,
    y_min: Math.min(draft.y0, draft.y1) * pageHeight,
    x_max: Math.max(draft.x0, draft.x1) * pageWidth,
    y_max: Math.max(draft.y0, draft.y1) * pageHeight,
  };
}

function rectsOverlap(a: PdfRect, b: PdfRect): boolean {
  return a.x_min < b.x_max && a.x_max > b.x_min && a.y_min < b.y_max && a.y_max > b.y_min;
}

function wordCenter(word: AnnotateWord): { x: number; y: number } {
  return {
    x: (word.x_min + word.x_max) / 2,
    y: (word.y_min + word.y_max) / 2,
  };
}

function pointInRect(x: number, y: number, rect: PdfRect): boolean {
  return x >= rect.x_min && x <= rect.x_max && y >= rect.y_min && y <= rect.y_max;
}

function overlapArea(a: PdfRect, b: PdfRect): number {
  const w = Math.max(0, Math.min(a.x_max, b.x_max) - Math.max(a.x_min, b.x_min));
  const h = Math.max(0, Math.min(a.y_max, b.y_max) - Math.max(a.y_min, b.y_min));
  return w * h;
}

/** Words whose center is in the selection, or that overlap ≥30% of their area. */
export function wordsIntersectingRect(words: AnnotateWord[], rect: PdfRect): AnnotateWord[] {
  if (rect.x_max <= rect.x_min || rect.y_max <= rect.y_min) {
    return [];
  }
  return words.filter((word) => {
    const box: PdfRect = {
      x_min: word.x_min,
      y_min: word.y_min,
      x_max: word.x_max,
      y_max: word.y_max,
    };
    if (!rectsOverlap(box, rect)) {
      return false;
    }
    const c = wordCenter(word);
    if (pointInRect(c.x, c.y, rect)) {
      return true;
    }
    const area = Math.max(1e-6, (word.x_max - word.x_min) * (word.y_max - word.y_min));
    return overlapArea(box, rect) / area >= 0.3;
  });
}

/** Reading order: top-to-bottom, then left-to-right (line band ≈ median word height). */
export function sortWordsReadingOrder(words: AnnotateWord[]): AnnotateWord[] {
  if (words.length <= 1) {
    return words.slice();
  }
  const heights = words.map((w) => Math.max(0.1, w.y_max - w.y_min)).sort((a, b) => a - b);
  const band = heights[Math.floor(heights.length / 2)] * 0.6;
  return words.slice().sort((a, b) => {
    const ay = (a.y_min + a.y_max) / 2;
    const by = (b.y_min + b.y_max) / 2;
    if (Math.abs(ay - by) > band) {
      return ay - by;
    }
    return a.x_min - b.x_min;
  });
}

export function unionWordBoxes(words: AnnotateWord[]): PdfRect | null {
  if (words.length === 0) {
    return null;
  }
  let xMin = words[0].x_min;
  let yMin = words[0].y_min;
  let xMax = words[0].x_max;
  let yMax = words[0].y_max;
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    xMin = Math.min(xMin, w.x_min);
    yMin = Math.min(yMin, w.y_min);
    xMax = Math.max(xMax, w.x_max);
    yMax = Math.max(yMax, w.y_max);
  }
  return { x_min: xMin, y_min: yMin, x_max: xMax, y_max: yMax };
}

export function joinSelectedText(words: AnnotateWord[]): string {
  return sortWordsReadingOrder(words)
    .map((w) => w.text.trim())
    .filter(Boolean)
    .join(" ");
}

/** Prefer word-snapped box + text when the drag covers words; else free-draw rect. */
export function resolveTextSelection(
  words: AnnotateWord[],
  draft: RelDraft,
  pageWidth: number,
  pageHeight: number,
): { box: PdfRect; text: string; fromWords: boolean } {
  const free = relDraftToPdf(draft, pageWidth, pageHeight);
  const hit = wordsIntersectingRect(words, free);
  if (hit.length === 0) {
    return { box: free, text: "", fromWords: false };
  }
  const box = unionWordBoxes(hit) ?? free;
  return { box, text: joinSelectedText(hit), fromWords: true };
}
