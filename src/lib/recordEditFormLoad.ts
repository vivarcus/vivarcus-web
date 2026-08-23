/** Whether the record edit form may accept input and Save. */
export function isRecordEditFormReady(opts: {
  editing: boolean;
  formLoading: boolean;
  hasForm: boolean;
}): boolean {
  return opts.editing && opts.hasForm && !opts.formLoading;
}

/**
 * Deep-link `/edit` must not paint the read-only detail (which looks "ready"
 * while the edit form is still fetching). Show a loading mask instead.
 */
export function shouldShowRecordEditLoading(opts: {
  isEditRoute: boolean;
  editing: boolean;
  formLoading: boolean;
  hasForm: boolean;
}): boolean {
  if (opts.formLoading) {
    return true;
  }
  if (opts.isEditRoute && !isRecordEditFormReady(opts)) {
    return true;
  }
  return false;
}

/**
 * Apply values from an async edit-form fetch. Skip stale responses and do not
 * clobber fields the user already edited.
 */
export function applyLoadedRecordFormValues(opts: {
  loadId: number;
  activeLoadId: number;
  loadedValues: Record<string, unknown>;
  currentValues: Record<string, unknown>;
  isDirty: boolean;
}): Record<string, unknown> | null {
  if (opts.loadId !== opts.activeLoadId) {
    return null;
  }
  if (opts.isDirty) {
    return opts.currentValues;
  }
  return { ...opts.loadedValues };
}
