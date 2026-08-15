export type MentionQuery = {
  query: string;
  start: number;
  end: number;
};

/** Detect an active @mention token ending at the caret. */
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const end = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, end);
  const at = before.lastIndexOf("@");
  if (at < 0) {
    return null;
  }
  if (at > 0) {
    const prev = before[at - 1];
    if (prev && !/\s/.test(prev)) {
      return null;
    }
  }
  const token = before.slice(at + 1);
  if (/[\s\n]/.test(token)) {
    return null;
  }
  return { query: token, start: at, end };
}

export function applyMention(
  text: string,
  caret: number,
  mentionLabel: string,
): { text: string; caret: number; mentionStart: number } {
  const active = findMentionQuery(text, caret);
  const label = mentionLabel.trim().replace(/^@+/, "");
  if (!label) {
    return { text, caret, mentionStart: caret };
  }
  const insert = `@${label} `;
  if (!active) {
    const next = `${text.slice(0, caret)}${insert}${text.slice(caret)}`;
    return { text: next, caret: caret + insert.length, mentionStart: caret };
  }
  const next = `${text.slice(0, active.start)}${insert}${text.slice(active.end)}`;
  return {
    text: next,
    caret: active.start + insert.length,
    mentionStart: active.start,
  };
}

export function normalizeMentionIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}
