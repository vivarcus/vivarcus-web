export type ListboxSelection = {
  selected: Set<string>;
  anchor: string | null;
};

export const emptyListboxSelection = (): ListboxSelection => ({
  selected: new Set(),
  anchor: null,
});

export function handleListboxClick(
  field: string,
  items: string[],
  event: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">,
  prev: ListboxSelection,
): ListboxSelection {
  const toggle = event.metaKey || event.ctrlKey;

  if (event.shiftKey && prev.anchor) {
    const anchorIdx = items.indexOf(prev.anchor);
    const clickIdx = items.indexOf(field);
    if (anchorIdx >= 0 && clickIdx >= 0) {
      const start = Math.min(anchorIdx, clickIdx);
      const end = Math.max(anchorIdx, clickIdx);
      const range = items.slice(start, end + 1);
      if (toggle) {
        const next = new Set(prev.selected);
        for (const id of range) {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        return { selected: next, anchor: field };
      }
      return { selected: new Set(range), anchor: field };
    }
  }

  if (toggle) {
    const next = new Set(prev.selected);
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    return { selected: next, anchor: field };
  }

  return { selected: new Set([field]), anchor: field };
}

export function isListboxItemSelected(selection: ListboxSelection, field: string): boolean {
  return selection.selected.has(field);
}

export function selectedFieldsInOrder(selection: ListboxSelection, order: string[]): string[] {
  return order.filter((field) => selection.selected.has(field));
}

export function selectedIndicesInOrder(selection: ListboxSelection, order: string[]): number[] {
  return order
    .map((field, index) => (selection.selected.has(field) ? index : -1))
    .filter((index) => index >= 0);
}

export function reorderSelectedBlock(order: string[], selected: Set<string>, delta: number): string[] {
  if (selected.size === 0) {
    return order;
  }

  const block = order.filter((field) => selected.has(field));
  const rest = order.filter((field) => !selected.has(field));
  const firstIdx = order.findIndex((field) => selected.has(field));
  const lastIdx = order.findLastIndex((field) => selected.has(field));

  if (delta < 0) {
    if (firstIdx <= 0) {
      return order;
    }
    const insertBefore = order[firstIdx - 1];
    const insertIdx = rest.indexOf(insertBefore);
    if (insertIdx < 0) {
      return order;
    }
    const next = [...rest];
    next.splice(insertIdx, 0, ...block);
    return next;
  }

  if (lastIdx >= order.length - 1) {
    return order;
  }
  const insertAfter = order[lastIdx + 1];
  const insertIdx = rest.indexOf(insertAfter);
  if (insertIdx < 0) {
    return order;
  }
  const next = [...rest];
  next.splice(insertIdx + 1, 0, ...block);
  return next;
}

export function reorderSelectedToEdge(order: string[], selected: Set<string>, toTop: boolean): string[] {
  if (selected.size === 0) {
    return order;
  }
  const block = order.filter((field) => selected.has(field));
  const rest = order.filter((field) => !selected.has(field));
  return toTop ? [...block, ...rest] : [...rest, ...block];
}

export function preventMouseDownFocusLoss(event: { preventDefault: () => void }) {
  event.preventDefault();
}
