export function fieldGridClassName(formColumns: number | undefined): string {
  return formColumns === 2
    ? "field-grid field-grid--two-col field-grid--detail field-grid--split-columns"
    : "field-grid field-grid--detail field-grid--one-col";
}

// detailColumnGridRows computes the left-column field capacity for Veeva two-column
// detailform column-major flow (fill left column top-to-bottom, then right).
// Layout field controls (e.g. duplicate_person_email_field_control) sit between
// fields in pagelayout markup but do not render as normal grid cells; they still
// extend the left column so later fields (mobile under email) stay on the left.
export function detailColumnGridRows(
  fieldCount: number,
  layoutControlCount = 0,
): number {
  if (fieldCount <= 0) {
    return 0;
  }
  return Math.ceil((fieldCount + layoutControlCount) / 2);
}

type DetailformPartitionOptions<T extends { kind: string }> = {
  isGridCell: (el: T) => boolean;
  isLayoutPhantom: (el: T) => boolean;
};

// partitionDetailformColumns walks pagelayout document order and assigns each grid
// cell (field, spacer, or layout-only control) to the left or right column stack.
export function partitionDetailformColumns<T extends { kind: string }>(
  elements: T[],
  options: DetailformPartitionOptions<T>,
): { left: T[]; right: T[] } {
  const gridFieldCount = elements.filter(options.isGridCell).length;
  const phantomCount = elements.filter(options.isLayoutPhantom).length;
  const leftCapacity = detailColumnGridRows(gridFieldCount, phantomCount);
  const left: T[] = [];
  const right: T[] = [];
  let fieldsInLeft = 0;

  for (const el of elements) {
    if (options.isLayoutPhantom(el)) {
      if (fieldsInLeft < leftCapacity) {
        left.push(el);
      }
      continue;
    }
    if (!options.isGridCell(el)) {
      continue;
    }
    if (fieldsInLeft < leftCapacity) {
      left.push(el);
      fieldsInLeft++;
    } else {
      right.push(el);
    }
  }
  return { left, right };
}
