export const TAB_NAV_MORE_BUTTON_WIDTH = 40;

export function computeVisibleTabCount(
  containerWidth: number,
  prefixWidth: number,
  itemWidths: readonly number[],
  moreButtonWidth: number,
): number {
  const itemCount = itemWidths.length;
  if (itemCount === 0 || containerWidth <= 0) {
    return itemCount;
  }

  const totalWidth =
    prefixWidth + itemWidths.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= containerWidth) {
    return itemCount;
  }

  let used = prefixWidth + moreButtonWidth;
  let count = 0;
  for (const width of itemWidths) {
    if (used + width > containerWidth) {
      break;
    }
    used += width;
    count += 1;
  }
  return count;
}
