import type { AnnotateWord } from "./annotateWordSelect";

export type HighlightBoxPct = {
  left_pct: number;
  top_pct: number;
  width_pct: number;
  height_pct: number;
};

function normalizeMatchText(s: string): string {
  const trimmed = s.toLowerCase().trim();
  if (!trimmed) {
    return "";
  }
  let out = "";
  let prevSpace = false;
  for (const ch of trimmed) {
    if (/\s/u.test(ch)) {
      if (!prevSpace && out.length > 0) {
        out += " ";
        prevSpace = true;
      }
      continue;
    }
    prevSpace = false;
    out += ch;
  }
  return out.trim();
}

function stripMatchSpaces(s: string): string {
  if (!s || !/\s/u.test(s)) {
    return s;
  }
  return s.replace(/\s+/gu, "");
}

function matchNormContains(cand: string, candTight: string, qNorm: string, qTight: string): boolean {
  if (qNorm && (cand.includes(qNorm) || candTight.includes(qNorm))) {
    return true;
  }
  if (qTight && qTight !== qNorm && candTight.includes(qTight)) {
    return true;
  }
  return false;
}

function clampPct(v: number): number {
  if (v < 0) {
    return 0;
  }
  if (v > 100) {
    return 100;
  }
  return v;
}

function pdfBoxToHighlight(
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
  pageW: number,
  pageH: number,
): HighlightBoxPct {
  let width = ((xmax - xmin) / pageW) * 100;
  let height = ((ymax - ymin) / pageH) * 100;
  if (width < 0.15) {
    width = 0.15;
  }
  if (height < 0.15) {
    height = 0.15;
  }
  return {
    left_pct: clampPct((xmin / pageW) * 100),
    top_pct: clampPct((ymin / pageH) * 100),
    width_pct: clampPct(width),
    height_pct: clampPct(height),
  };
}

function boxesOverlapOrNear(a: HighlightBoxPct, b: HighlightBoxPct, pad: number): boolean {
  const aRight = a.left_pct + a.width_pct;
  const aBottom = a.top_pct + a.height_pct;
  const bRight = b.left_pct + b.width_pct;
  const bBottom = b.top_pct + b.height_pct;
  return (
    a.left_pct - pad <= bRight &&
    b.left_pct - pad <= aRight &&
    a.top_pct - pad <= bBottom &&
    b.top_pct - pad <= aBottom
  );
}

function unionHighlight(a: HighlightBoxPct, b: HighlightBoxPct): HighlightBoxPct {
  const left = Math.min(a.left_pct, b.left_pct);
  const top = Math.min(a.top_pct, b.top_pct);
  const right = Math.max(a.left_pct + a.width_pct, b.left_pct + b.width_pct);
  const bottom = Math.max(a.top_pct + a.height_pct, b.top_pct + b.height_pct);
  return {
    left_pct: left,
    top_pct: top,
    width_pct: right - left,
    height_pct: bottom - top,
  };
}

function mergeNearbyHighlightBoxes(boxes: HighlightBoxPct[]): HighlightBoxPct[] {
  if (boxes.length <= 1) {
    return boxes;
  }
  const out: HighlightBoxPct[] = [];
  let cur = boxes[0];
  for (let i = 1; i < boxes.length; i++) {
    const next = boxes[i];
    if (boxesOverlapOrNear(cur, next, 1.5)) {
      cur = unionHighlight(cur, next);
      continue;
    }
    out.push(cur);
    cur = next;
  }
  out.push(cur);
  return out;
}

/** Match a query against page words (same algorithm as Go matchQueryHighlightBoxes). */
export function matchPageQueryHighlightBoxes(
  words: AnnotateWord[],
  pageWidth: number,
  pageHeight: number,
  query: string,
): HighlightBoxPct[] {
  const qNorm = normalizeMatchText(query);
  const qTight = stripMatchSpaces(qNorm);
  if (!qNorm || words.length === 0 || pageWidth <= 0 || pageHeight <= 0) {
    return [];
  }
  const maxWindow = 48;
  const hits: HighlightBoxPct[] = [];
  for (let i = 0; i < words.length; i++) {
    let joined = "";
    let joinedTight = "";
    for (let j = i; j < words.length && j < i + maxWindow; j++) {
      const w = words[j];
      if (j > i) {
        joined += " ";
      }
      joined += w.text;
      joinedTight += w.text;
      const cand = normalizeMatchText(joined);
      const candTight = stripMatchSpaces(normalizeMatchText(joinedTight));
      if (matchNormContains(cand, candTight, qNorm, qTight)) {
        let start = i;
        const end = j;
        while (start < end) {
          let sub = "";
          let subTight = "";
          for (let k = start + 1; k <= end; k++) {
            if (k > start + 1) {
              sub += " ";
            }
            sub += words[k].text;
            subTight += words[k].text;
          }
          const subNorm = normalizeMatchText(sub);
          const subTightNorm = stripMatchSpaces(normalizeMatchText(subTight));
          if (matchNormContains(subNorm, subTightNorm, qNorm, qTight)) {
            start += 1;
            continue;
          }
          break;
        }
        let xmin = words[start].x_min;
        let ymin = words[start].y_min;
        let xmax = words[start].x_max;
        let ymax = words[start].y_max;
        for (let k = start + 1; k <= end; k++) {
          const ww = words[k];
          xmin = Math.min(xmin, ww.x_min);
          ymin = Math.min(ymin, ww.y_min);
          xmax = Math.max(xmax, ww.x_max);
          ymax = Math.max(ymax, ww.y_max);
        }
        hits.push(pdfBoxToHighlight(xmin, ymin, xmax, ymax, pageWidth, pageHeight));
        i = end;
        break;
      }
      if ([...cand].length > [...qNorm].length + 24 && [...candTight].length > [...qTight].length + 24) {
        break;
      }
    }
    if (hits.length >= 8) {
      break;
    }
  }
  return mergeNearbyHighlightBoxes(hits);
}
