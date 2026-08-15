/** Format a document version tuple for display, e.g. "(v1.1)". */
export function formatDocumentVersionLabel(major: number, minor: number): string {
  return `(v${major}.${minor})`;
}
