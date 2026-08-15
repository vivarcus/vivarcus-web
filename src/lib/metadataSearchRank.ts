/** Lower rank is a better search match. Infinity means no match. */
export function metadataSearchRank(query: string, ...candidates: Array<string | undefined | null>): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const raw of candidates) {
    const value = (raw ?? "").trim().toLowerCase();
    if (!value) continue;
    if (value === q) best = Math.min(best, 0);
    else if (value.startsWith(q)) best = Math.min(best, 1);
    else if (value.includes(q)) best = Math.min(best, 2);
  }
  return best;
}

/** Filter items by query and order exact / prefix / substring matches first. */
export function filterAndRankByQuery<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | undefined | null>,
): T[] {
  const q = query.trim();
  if (!q) return items;
  return items
    .map((item, index) => ({
      item,
      index,
      rank: metadataSearchRank(q, ...fields(item)),
    }))
    .filter((row) => row.rank !== Number.POSITIVE_INFINITY)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((row) => row.item);
}
