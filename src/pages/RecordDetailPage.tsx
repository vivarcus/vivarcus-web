import { LockOutlined } from "@ant-design/icons";
import { Alert, Button, Spin, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { ChangeTypeWarning, LifecycleAction, RecordFormModel, RecordPageModel, StartNextWorkflowResult } from "../api/types";
import { useUi } from "../context/UiContext";
import { FormMetaProvider } from "../context/FormMetaContext";
import { useVaultAI } from "../context/VaultAIContext";
import { handleStaleError } from "../lib/staleGuard";
import { defaultFormChrome, defaultPageActionLabels, defaultPageMessages, displayText } from "../lib/i18n";
import { recordHeaderStateLabel } from "../lib/recordHeaderStateLabel";
import { downloadOutboundVpkArtifact } from "../lib/outboundExportDownload";
import { LifecycleStagesChevron } from "../components/LifecycleStagesChevron";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import { RecordPageBody, RecordPageShell } from "../components/record/RecordPageShell";
import { ObjectRecordPageShell } from "../components/record/ObjectRecordPageShell";
import { RecordToolbar } from "../components/RecordToolbar";
import { RecordListNav } from "../components/RecordListNav";
import { RecordAuditModal } from "../components/RecordAuditModal";
import { RecordFormSections } from "../components/record/RecordFormSections";
import {
  RecordFieldSections,
  RecordSectionNav,
  shouldShowRecordSectionNav,
} from "../components/RecordSections";
import { scrollToRecordSection, resolveExpandedSections, sectionExpandStorageKey, writeExpandedSections } from "../components/record/recordSectionUtils";
import { SummaryInfoPanel } from "../components/SummaryInfoPanel";
import { useLayoutRuleEffects } from "../hooks/useLayoutRuleEffects";
import { useLookupDisplays } from "../hooks/useLookupDisplays";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { applyLayoutRuleEffects, visibleFormSections } from "../lib/layoutRules";
import { applyDocumentFormReferenceOptions, isDocumentObjectClass } from "../lib/documentForm";
import { documentViewerRefreshKey } from "../lib/documentCheckout";
import {
  applyPicklistCascadeOptions,
  pruneInvalidPicklistValues,
} from "../lib/picklistForm";
import { applyLookupDisplays } from "../lib/lookupForm";
import {
  isLocaleAllowedForLanguageEdit,
  localeReferenceOptionsForLanguage,
} from "../components/UserProfileGeneralField";
import { hasL10nLocaleCascade } from "../lib/l10nForm";
import {
  applyFieldValidationErrors,
  mapServerErrorToFieldErrors,
  scrollToFirstFieldError,
  validateRecordFormSections,
} from "../lib/recordFormValidation";
import { ChangeTypeModal } from "../components/ChangeTypeModal";
import { ChangeTypeWarningModal } from "../components/ChangeTypeWarningModal";
import { WorkflowStartModal } from "../components/WorkflowStartModal";
import { StartNextWorkflowModal } from "../components/StartNextWorkflowModal";
import { WorkflowTaskPanel } from "../components/WorkflowTaskPanel";
import { PreExecutionDialogModal } from "../components/PreExecutionDialogModal";
import { getLastTab, type RecordNavState } from "../lib/vaultNav";
import { NAV_TRAIL_PARAM, decodeNavTrail, navTrailBreadcrumbItems } from "../lib/navTrail";
import { useRelatedSectionCountPrefetch } from "../hooks/useRelatedSectionCountPrefetch";
import { relatedSectionCountsFromPage } from "../lib/relatedSectionCount";
import { useRecordLifecycleActions } from "../hooks/useRecordLifecycleActions";
import { useTabLabel } from "../lib/useTabLabel";
import { RecordStateBadge } from "../components/record/RecordStateBadge";
import { partitionLifecycleToolbarActions } from "../components/record/lifecycleToolbarActions";
import { formatDocumentVersionLabel } from "../lib/documentVersion";
import { recordDisplayName } from "../lib/recordDisplayName";
import { recordListHref } from "../lib/recordListHref";
import { recordViewPathname } from "../lib/recordEditHref";
import {
  applyLoadedRecordFormValues,
  isRecordEditFormReady,
  shouldShowRecordEditLoading,
} from "../lib/recordEditFormLoad";
import { isBinderObjectType } from "../lib/recordPageShell";

const RECORD_EDIT_FORM_ID = "record-edit-form";
const EMPTY_FORM_SECTIONS: RecordFormModel["sections"] = [];

function initialExpandedSections(
  sections: RecordPageModel["sections"],
  storageKey: string,
): Set<string> {
  return resolveExpandedSections(sections, storageKey);
}

export function RecordDetailPage() {
  const vaultId = useVaultId();
  const { objectName, recordId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { shell } = useUi();
  const { setPageNavigator } = useVaultAI();
  const [page, setPage] = useState<RecordPageModel | null>(null);
  const [startNext, setStartNext] = useState<StartNextWorkflowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const sectionStorageKeyRef = useRef("");
  const loadGenerationRef = useRef(0);
  const editLoadIdRef = useRef(0);
  const valuesRef = useRef<Record<string, unknown>>({});
  const [deleting, setDeleting] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [countPrefetchKey, setCountPrefetchKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionNavCollapsed, setSectionNavCollapsed] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [viewerFocusPageRequest, setViewerFocusPageRequest] = useState<{
    page: number;
    token: number;
    query?: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RecordFormModel | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const [changeTypeOpen, setChangeTypeOpen] = useState(false);
  const [changeTypePending, setChangeTypePending] = useState(false);
  const [changeTypeWarningOpen, setChangeTypeWarningOpen] = useState(false);
  const [changeTypeWarning, setChangeTypeWarning] = useState<ChangeTypeWarning | null>(null);
  const [pendingChangeTypeName, setPendingChangeTypeName] = useState("");
  const messages = { ...defaultPageMessages, ...(page?.messages ?? {}) };
  const actionLabels = { ...defaultPageActionLabels, ...(page?.actions.labels ?? {}) };

  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const runChangeTypeRef = useRef<(objectTypeName: string) => Promise<void>>(async () => {});
  const {
    lifecyclePending,
    workflowDialogAction,
    preExecutionDialog,
    preExecutionActionLabel,
    preExecutionActionName,
    preExecutionActionKind,
    dialogTarget,
    workflowFieldValues,
    workflowParticipantValues,
    workflowDateValues,
    workflowAssignmentTypeValues,
    preExecutionInputValues,
    setWorkflowFieldValues,
    setWorkflowParticipantValues,
    setWorkflowDateValues,
    setWorkflowAssignmentTypeValues,
    setPreExecutionInputValues,
    handleLifecycleAction,
    handleSdkAction,
    confirmWorkflowDialog,
    confirmPreExecutionDialog,
    cancelActionDialog,
    documentUploadRequest,
    clearDocumentUploadRequest,
    completeDocumentUpload,
  } = useRecordLifecycleActions({
    vaultId,
    actionFailedLabel: displayText(shell.action_failed),
    onReload: async () => {
      await loadRef.current?.();
    },
    setError,
    getFixedTarget: () => {
      if (!page || !objectName || !recordId) {
        return null;
      }
      return { objectName, recordId, page };
    },
    onPageUpdated: setPage,
    onChangeTypePreview: async (_target, objectTypeName) => {
      await runChangeTypeRef.current(objectTypeName);
    },
  });
  const toolbarActionPending = lifecyclePending || changeTypePending;

  const layout = searchParams.get("layout") ?? undefined;
  const pageApiName = searchParams.get("page") ?? undefined;
  const downloadVpkId = searchParams.get("download_vpk") ?? undefined;
  const isEditRoute = /\/edit\/?$/.test(location.pathname);
  const editRouteHandledRef = useRef(false);
  const editFormReady = isRecordEditFormReady({
    editing,
    formLoading,
    hasForm: Boolean(form),
  });
  const showEditLoading = shouldShowRecordEditLoading({
    isEditRoute,
    editing,
    formLoading,
    hasForm: Boolean(form),
  });

  useEffect(() => {
    if (!vaultId || !downloadVpkId || objectName !== "outbound_package__v") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await downloadOutboundVpkArtifact(vaultId, downloadVpkId);
        if (!cancelled) {
          message.success("Download started");
        }
      } catch (err) {
        if (!cancelled) {
          message.error(err instanceof Error ? err.message : "Download failed");
        }
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams);
          next.delete("download_vpk");
          setSearchParams(next, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, downloadVpkId, objectName, searchParams, setSearchParams]);

  const navState = (location.state as RecordNavState | null) ?? {};
  const tabApiName = searchParams.get("tab") ?? navState.tabApiName ?? (vaultId ? getLastTab(vaultId) : undefined);
  const tabLabel = useTabLabel(tabApiName, navState.tabLabel);
  const navTrailHops = useMemo(
    () => decodeNavTrail(searchParams.get(NAV_TRAIL_PARAM)),
    [searchParams],
  );

  const { effects, evaluating, error: ruleError } = useLayoutRuleEffects({
    vaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    layoutApiName: form?.selected_layout?.api_name,
    fieldValues: values,
    liveEvaluation: Array.isArray(form?.layout_rules) && form.layout_rules.length > 0,
    enabled: editing && Boolean(form),
  });

  const { displays: lookupDisplays } = useLookupDisplays({
    vaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    fieldValues: values,
    sections: form?.sections ?? EMPTY_FORM_SECTIONS,
    enabled: editing && Boolean(form),
  });

  const displaySections = useMemo(() => {
    if (!form) return [];
    let sections = applyLayoutRuleEffects(form.sections ?? [], effects);
    if (isDocumentObjectClass(form.object_class)) {
      sections = applyDocumentFormReferenceOptions(sections, form.document, values);
    }
    sections = applyPicklistCascadeOptions(sections, values);
    sections = applyLookupDisplays(sections, lookupDisplays);
    if (!hasL10nLocaleCascade(form.l10n)) {
      return visibleFormSections(applyFieldValidationErrors(sections, fieldValidationErrors));
    }
    const languageRecordId = String(values.language__sys ?? "");
    const localeOptions = localeReferenceOptionsForLanguage(
      form.l10n.locale_references_by_language,
      languageRecordId,
      [],
    );
    return visibleFormSections(
      applyFieldValidationErrors(
        sections.map((section) => ({
          ...section,
          elements: section.elements.map((el) => {
            if (el.field_api_name !== "locale__sys") {
              return el;
            }
            return {
              ...el,
              field_render: {
                ...el.field_render,
                reference_options: localeOptions,
              },
            };
          }),
        })),
        fieldValidationErrors,
      ),
    );
  }, [form, effects, values, values.language__sys, values.type__v, values.subtype__v, lookupDisplays, fieldValidationErrors]);

  const isDirty = useMemo(
    () => Boolean(form) && JSON.stringify(values) !== JSON.stringify(initialValues),
    [form, values, initialValues],
  );
  useUnsavedChangesGuard(editing && isDirty && !submitting);

  function updateField(name: string, raw: unknown) {
    setFieldValidationErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
    const prev = valuesRef.current;
    let updated = { ...prev, [name]: raw };
    updated = pruneInvalidPicklistValues(updated, form?.sections ?? [], name);
    if (name === "language__sys" && hasL10nLocaleCascade(form?.l10n)) {
      const locale = String(updated.locale__sys ?? "");
      if (
        locale &&
        !isLocaleAllowedForLanguageEdit(
          form.l10n?.locale_references_by_language,
          String(raw ?? ""),
          locale,
        )
      ) {
        updated.locale__sys = "";
      }
    }
    if (isDocumentObjectClass(form?.object_class)) {
      if (name === "type__v") {
        updated.subtype__v = "";
        updated.classification__v = "";
      }
      if (name === "subtype__v") {
        updated.classification__v = "";
      }
    }
    valuesRef.current = updated;
    setValues(updated);
  }

  const load = useCallback(async (opts?: { layoutOverride?: string | null }) => {
    if (!vaultId || !objectName || !recordId) return;
    const layoutToUse =
      opts?.layoutOverride === null ? undefined : (opts?.layoutOverride ?? layout);
    const softRefresh = hasLoadedOnceRef.current;
    const generation = ++loadGenerationRef.current;
    if (softRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setSectionCounts({});
    try {
      const data = await api.recordPage(vaultId, objectName, recordId, {
        layout: layoutToUse,
        page: pageApiName,
      });
      if (generation !== loadGenerationRef.current) {
        return;
      }
      const storageKey = sectionExpandStorageKey(vaultId, objectName, recordId, layoutToUse);
      sectionStorageKeyRef.current = storageKey;
      setPage(data);
      setSectionCounts(relatedSectionCountsFromPage(data.sections));
      setExpandedSections(initialExpandedSections(data.sections, storageKey));
      setCountPrefetchKey((key) => key + 1);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : displayText(defaultPageMessages.load_failed));
      if (!softRefresh) {
        setPage(null);
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [vaultId, objectName, recordId, layout, pageApiName]);

  loadRef.current = load;

  // Hard-reset load cache when switching vault/object; record-to-record list nav soft-refreshes.
  useEffect(() => {
    hasLoadedOnceRef.current = false;
    sectionStorageKeyRef.current = "";
  }, [vaultId, objectName]);

  useEffect(() => {
    sectionStorageKeyRef.current = "";
  }, [recordId]);

  useEffect(() => {
    void load();
  }, [vaultId, objectName, recordId, layout, pageApiName]);

  useEffect(() => {
    if ((navState as RecordNavState).recordPageRefresh) {
      hasLoadedOnceRef.current = false;
      void loadRef.current?.();
    }
  }, [navState.recordPageRefresh]);

  useEffect(() => {
    if (page) {
      setFavorited(Boolean(page.actions.favorited));
    }
  }, [page]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      if (sectionStorageKeyRef.current) {
        writeExpandedSections(sectionStorageKeyRef.current, next);
      }
      return next;
    });
  }, []);

  const navigateToSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      if (sectionStorageKeyRef.current) {
        writeExpandedSections(sectionStorageKeyRef.current, next);
      }
      return next;
    });
    scrollToRecordSection(sectionId);
  }, []);

  const onSectionCountChange = useCallback((sectionId: string, total: number | undefined) => {
    if (total === undefined) {
      setSectionCounts((prev) => {
        if (!(sectionId in prev)) return prev;
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
      return;
    }
    // Counts are surfaced in the section nav independent of expansion state
    // (collapsed sections prefetch their total too), so do not couple a
    // positive count to auto-expanding the section.
    setSectionCounts((prev) =>
      prev[sectionId] === total ? prev : { ...prev, [sectionId]: total },
    );
  }, []);

  const sections = page?.sections ?? [];
  const isChangeTypeEditing = editing && form?.mode === "change_type";
  const navSections = editing && form ? displaySections : sections;
  const changeStateActions = useMemo(
    () => partitionLifecycleToolbarActions(page?.lifecycle_actions ?? []).changeState,
    [page?.lifecycle_actions],
  );
  useRelatedSectionCountPrefetch({
    vaultId,
    sections,
    expandedSections,
    onCountChange: onSectionCountChange,
    resetKey: countPrefetchKey,
    enabled: Boolean(page && !editing),
  });

  const pageShell = editing ? undefined : page?.page_shell;
  const isDocumentSplit = pageShell?.kind === "document_split";
  const isBinderTree = pageShell?.kind === "binder_tree";

  useEffect(() => {
    if (!isDocumentSplit) {
      setPageNavigator(null);
      return;
    }
    setPageNavigator((pageNum, query) => {
      setViewerFocusPageRequest({ page: pageNum, token: Date.now(), query });
    });
    return () => setPageNavigator(null);
  }, [isDocumentSplit, setPageNavigator]);

  const showSectionNav =
    !isDocumentSplit &&
    !isBinderTree &&
    shouldShowRecordSectionNav(navSections, editing ? {} : sectionCounts);
  const recordBodyClass = [
    "record-page__body",
    showSectionNav && !sectionNavCollapsed ? "record-page__body--with-nav" : "",
    showSectionNav && sectionNavCollapsed ? "record-page__body--nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!vaultId || !objectName || !recordId) {
    return null;
  }

  async function toggleFavorite() {
    if (!vaultId || !objectName || !recordId || !page?.actions.favorite_allowed) return;
    const next = !favorited;
    setFavoritePending(true);
    try {
      await api.setRecordFavorite(vaultId, objectName, recordId, next);
      setFavorited(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.action_failed));
    } finally {
      setFavoritePending(false);
    }
  }

  async function runDelete() {
    if (!vaultId || !objectName || !recordId || !page) return;
    if (!window.confirm(displayText(page.messages?.delete_confirm ?? messages.delete_confirm))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteRecord(vaultId, objectName, recordId);
      navigate(listHref);
    } catch (err) {
      await handleStaleError(err, load, setError, displayText(shell.delete_failed), shell);
    } finally {
      setDeleting(false);
    }
  }

  async function enterEdit() {
    if (!vaultId || !objectName || !recordId) return;
    const loadId = ++editLoadIdRef.current;
    setEditing(true);
    setFormLoading(true);
    setEditError(null);
    setFieldValidationErrors({});
    try {
      const model = await api.editForm(vaultId, objectName, recordId, { layout, page: pageApiName });
      if (loadId !== editLoadIdRef.current) {
        return;
      }
      const loadedValues = { ...(model.values ?? {}) };
      const nextValues = applyLoadedRecordFormValues({
        loadId,
        activeLoadId: editLoadIdRef.current,
        loadedValues,
        currentValues: valuesRef.current,
        isDirty: JSON.stringify(valuesRef.current) !== JSON.stringify(initialValues),
      });
      setForm(model);
      if (nextValues) {
        valuesRef.current = nextValues;
        setValues(nextValues);
        setInitialValues(loadedValues);
      }
    } catch (err) {
      if (loadId !== editLoadIdRef.current) {
        return;
      }
      setEditing(false);
      setForm(null);
      setError(err instanceof Error ? err.message : displayText(shell.load_form_failed));
      if (isEditRoute) {
        navigate(
          { pathname: recordViewPathname(location.pathname), search: location.search },
          { replace: true, state: location.state },
        );
      }
    } finally {
      if (loadId === editLoadIdRef.current) {
        setFormLoading(false);
      }
    }
  }

  function leaveEditRoute() {
    if (!isEditRoute) return;
    navigate(
      { pathname: recordViewPathname(location.pathname), search: location.search },
      { replace: true, state: location.state },
    );
  }

  function cancelEdit() {
    editLoadIdRef.current += 1;
    setEditing(false);
    setForm(null);
    valuesRef.current = {};
    setValues({});
    setInitialValues({});
    setEditError(null);
    setFieldValidationErrors({});
    leaveEditRoute();
  }

  useEffect(() => {
    editLoadIdRef.current += 1;
    editRouteHandledRef.current = false;
    setEditing(false);
    setForm(null);
    valuesRef.current = {};
    setValues({});
    setInitialValues({});
    setFormLoading(false);
    setEditError(null);
    setFieldValidationErrors({});
  }, [vaultId, objectName, recordId, isEditRoute]);

  useEffect(() => {
    if (!isEditRoute || !page || loading || editing || editRouteHandledRef.current) {
      return;
    }
    editRouteHandledRef.current = true;
    if (!page.actions.edit_allowed) {
      navigate(
        { pathname: recordViewPathname(location.pathname), search: location.search },
        { replace: true, state: location.state },
      );
      return;
    }
    void enterEdit();
  }, [isEditRoute, page, loading, editing, location.pathname, location.search, location.state, navigate]);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!vaultId || !objectName || !recordId || !form || submitting) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const fields = valuesRef.current;
    const formChrome = form.chrome ?? defaultFormChrome;
    const validation = validateRecordFormSections(
      displaySections,
      fields,
      formChrome.field_required ?? defaultFormChrome.field_required,
      { invalidEmailMessage: formChrome.field_invalid_email ?? defaultFormChrome.field_invalid_email },
    );
    if (!validation.valid) {
      setFieldValidationErrors(validation.fieldErrors);
      const errorCount = Object.keys(validation.fieldErrors).length;
      setEditError(
        errorCount === 1 && validation.firstErrorMessage
          ? validation.firstErrorMessage
          : displayText(formChrome.validation_fix_fields ?? defaultFormChrome.validation_fix_fields),
      );
      scrollToFirstFieldError(displaySections, validation.fieldErrors);
      return;
    }
    setFieldValidationErrors({});
    if (form.mode === "change_type" && !form.object_type_api_name?.trim()) {
      setEditError(displayText(shell.save_failed));
      return;
    }
    setSubmitting(true);
    setEditError(null);
    const savingChangeType = form.mode === "change_type";
    try {
      if (savingChangeType) {
        await api.submitChangeType(vaultId, objectName, recordId, {
          fields,
          object_type_name: form.object_type_api_name!.trim(),
          form_guard: form.form_guard,
          form_context_token: form.form_context_token,
        });
        const next = new URLSearchParams(searchParams);
        next.delete("layout");
        setSearchParams(next, { replace: true });
      } else {
        await api.submitEdit(vaultId, objectName, recordId, {
          fields,
          object_type_name: form.object_type_api_name,
          form_guard: form.form_guard,
          form_context_token: form.form_context_token,
        });
      }
      setEditing(false);
      setForm(null);
      valuesRef.current = {};
      setValues({});
      setInitialValues({});
      if (isEditRoute) {
        navigate(
          { pathname: recordViewPathname(location.pathname), search: location.search },
          { replace: true, state: location.state },
        );
      } else {
        await load(savingChangeType ? { layoutOverride: null } : undefined);
      }
    } catch (err) {
      const mapped = mapServerErrorToFieldErrors(
        displaySections,
        err instanceof Error ? err.message : "",
      );
      if (mapped) {
        setFieldValidationErrors(mapped);
        scrollToFirstFieldError(displaySections, mapped);
      }
      await handleStaleError(err, load, setEditError, displayText(shell.save_failed), shell);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadChangeTypeForm(objectTypeName: string) {
    if (!vaultId || !objectName || !recordId) {
      return;
    }
    const loadId = ++editLoadIdRef.current;
    setChangeTypePending(true);
    setEditing(true);
    setFormLoading(true);
    setEditError(null);
    setFieldValidationErrors({});
    try {
      const model = await api.changeTypeForm(vaultId, objectName, recordId, {
        object_type_name: objectTypeName,
      });
      if (loadId !== editLoadIdRef.current) {
        return;
      }
      const loadedValues = { ...(model.values ?? {}) };
      const nextValues = applyLoadedRecordFormValues({
        loadId,
        activeLoadId: editLoadIdRef.current,
        loadedValues,
        currentValues: valuesRef.current,
        isDirty: JSON.stringify(valuesRef.current) !== JSON.stringify(initialValues),
      });
      setForm(model);
      if (nextValues) {
        valuesRef.current = nextValues;
        setValues(nextValues);
        setInitialValues(loadedValues);
      }
      setChangeTypeOpen(false);
      setChangeTypeWarningOpen(false);
      setChangeTypeWarning(null);
      setPendingChangeTypeName("");
    } catch (err) {
      if (loadId !== editLoadIdRef.current) {
        return;
      }
      setEditing(false);
      setForm(null);
      await handleStaleError(err, load, setError, displayText(shell.action_failed), shell);
    } finally {
      if (loadId === editLoadIdRef.current) {
        setFormLoading(false);
      }
      setChangeTypePending(false);
    }
  }

  async function beginChangeType(objectTypeName: string) {
    if (!vaultId || !objectName || !recordId || changeTypePending) {
      return;
    }
    setChangeTypePending(true);
    setEditError(null);
    try {
      const warning = await api.changeTypeWarning(vaultId, objectName, recordId, {
        object_type_name: objectTypeName,
      });
      if (warning.required && (warning.fields?.length ?? 0) > 0) {
        setPendingChangeTypeName(objectTypeName);
        setChangeTypeWarning(warning);
        setChangeTypeOpen(false);
        setChangeTypeWarningOpen(true);
        return;
      }
    } catch (err) {
      await handleStaleError(err, load, setError, displayText(shell.action_failed), shell);
      return;
    } finally {
      setChangeTypePending(false);
    }
    await loadChangeTypeForm(objectTypeName);
  }
  runChangeTypeRef.current = beginChangeType;

  const recordDisplayNameValue = recordDisplayName(page, recordId);
  const objectLabel = page
    ? displayText(page.object_label, page.object_api_name)
    : objectName;
  const documentHeader = page?.document_header;
  const isBinderRecord =
    isBinderTree || isBinderObjectType(page?.object_type_api_name);
  const isDocumentObject = page?.object_class === "document" && !isBinderRecord;
  const recordTitle = isDocumentObject || isBinderTree
    ? `${recordDisplayNameValue}${documentHeader ? ` ${formatDocumentVersionLabel(documentHeader.major_version_number, documentHeader.minor_version_number)}` : ""}`
    : `${objectLabel}: ${recordDisplayNameValue}`;
  const stateLabel = recordHeaderStateLabel(page);

  const listHref = recordListHref(tabApiName);

  const favoriteButton =
    page?.actions.favorite_allowed ? (
      <Button
        type="text"
        className={`record-favorite-star${favorited ? " record-favorite-star--active" : ""}`}
        aria-pressed={favorited}
        aria-label={
          favorited
            ? displayText(actionLabels.unfavorite)
            : displayText(actionLabels.favorite)
        }
        disabled={favoritePending}
        loading={favoritePending}
        onClick={() => void toggleFavorite()}
      >
        {favorited ? "★" : "☆"}
      </Button>
    ) : undefined;

  const checkoutLockLabel = documentHeader?.checkout?.locked_by_me
    ? displayText(shell.document_viewer.checked_out_by_you, "Checked out by you")
    : displayText(shell.document_viewer.checked_out, "Checked out");
  const checkoutLock = documentHeader?.checkout?.locked ? (
    <span
      className="record-checkout-lock"
      title={checkoutLockLabel}
      aria-label={checkoutLockLabel}
      data-testid="record-checkout-lock"
    >
      <LockOutlined aria-hidden="true" />
    </span>
  ) : null;

  const statusBadge = stateLabel ? (
    <RecordStateBadge
      stateLabel={stateLabel}
      changeStateActions={changeStateActions}
      lifecyclePending={toolbarActionPending}
      onLifecycleAction={handleLifecycleAction}
    />
  ) : undefined;

  const headerTrailing =
    checkoutLock || statusBadge ? (
      <>
        {checkoutLock}
        {statusBadge}
      </>
    ) : undefined;

  const headerBelow =
    !isChangeTypeEditing && page?.summary_info ? (
    <SummaryInfoPanel
      vaultId={vaultId}
      summary={page.summary_info}
      tabApiName={tabApiName}
      displayContext={page.display_context}
    />
  ) : undefined;

  const stagesBand =
    !isChangeTypeEditing && page?.lifecycle_chevron ? (
    <div className="record-page__chevron-band">
      <LifecycleStagesChevron chevron={page.lifecycle_chevron} />
    </div>
  ) : undefined;

  const workflowTaskBanner =
    page && !editing && objectName && recordId && (page.workflow_tasks?.length ?? 0) > 0 ? (
      <WorkflowTaskPanel
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        page={page}
        onPageUpdate={setPage}
        onError={(msg) => setError(msg || null)}
        onReloadPage={load}
        onStartNext={setStartNext}
        variant="banner"
      />
    ) : null;

  const changeTypeSaveLabel =
    form?.mode === "change_type" && page?.actions.change_type?.labels.confirm
      ? displayText(page.actions.change_type.labels.confirm)
      : null;

  const editFormActions =
    editFormReady && form ? (
      <div className="page-header__actions">
        <Button type="text" onClick={cancelEdit} disabled={submitting}>
          {displayText(shell.cancel)}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          form={RECORD_EDIT_FORM_ID}
          loading={submitting}
          disabled={submitting || form.submit_blocked || evaluating}
        >
          {submitting
            ? displayText(defaultFormChrome.saving)
            : changeTypeSaveLabel ?? displayText(defaultFormChrome.submit_save)}
        </Button>
      </div>
    ) : null;

  const recordMain =
    showEditLoading ? (
      <Spin
        description={displayText(defaultFormChrome.loading_form)}
        className="page-loading page__loading"
      />
    ) : editFormReady && form ? (
      <form id={RECORD_EDIT_FORM_ID} className="record-form record-form--edit" onSubmit={saveEdit}>
        <FormMetaProvider
          objectApiName={form.object_api_name}
          objectTypeApiName={form.object_type_api_name}
        >
          <RecordFormSections
            vaultId={vaultId}
            sections={displaySections}
            values={values}
            onFieldChange={updateField}
            chrome={form.chrome ?? defaultFormChrome}
            recordIdPlaceholder={displayText(
              (form.chrome ?? defaultFormChrome).record_id_placeholder,
            )}
            displayContext={form.display_context}
          />
        </FormMetaProvider>
        {form.submit_blocked && (
          <Alert
            type="warning"
            showIcon
            title={
              form.submit_block_reason?.trim()
                ? form.submit_block_reason
                : displayText(shell.save_failed)
            }
          />
        )}
      </form>
    ) : page ? (
      <RecordFieldSections
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        page={page}
        sections={sections}
        workflowTasks={page.workflow_tasks}
        tabApiName={tabApiName}
        displayContext={page.display_context}
        messages={page.messages}
        expandedSections={expandedSections}
        sectionCounts={sectionCounts}
        onToggleSection={toggleSection}
        onSectionCountChange={onSectionCountChange}
        onPageUpdate={setPage}
        onError={(msg) => setError(msg || null)}
        onReloadPage={load}
        onStartNext={setStartNext}
      />
    ) : null;

  const recordBody = page ? (
    <RecordPageBody
      className={recordBodyClass}
      mainClassName={[
        refreshing ? "record-page__main--refreshing" : "",
        isDocumentSplit ? "record-page__main--document-split" : "",
        isBinderTree ? "record-page__main--binder-tree" : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      sectionNav={
        showSectionNav ? (
          <RecordSectionNav
            sections={navSections}
            sectionCounts={editing ? {} : sectionCounts}
            ariaLabel={displayText(page.messages.section_nav_aria)}
            onNavigate={navigateToSection}
            collapsed={sectionNavCollapsed}
            onToggleCollapse={() => setSectionNavCollapsed((prev) => !prev)}
            collapseLabel={displayText(messages.collapse_section_nav)}
            expandLabel={displayText(messages.expand_section_nav)}
          />
        ) : undefined
      }
    >
      <ObjectRecordPageShell
        shell={pageShell}
        vaultId={vaultId}
        objectApiName={objectName}
        recordId={recordId}
        isDocumentObject={isDocumentObject}
        documentUploadRequest={documentUploadRequest}
        onDocumentUploadComplete={completeDocumentUpload}
        onDocumentUploadHandled={clearDocumentUploadRequest}
        documentActions={page?.sdk_actions}
        onDocumentAction={handleSdkAction}
        documentActionPending={toolbarActionPending}
        viewerRefreshKey={documentViewerRefreshKey(page)}
        onRecordPageReload={load}
        focusPageRequest={viewerFocusPageRequest}
      >
        {recordMain}
      </ObjectRecordPageShell>
    </RecordPageBody>
  ) : undefined;

  return (
    <>
    <RecordPageShell
      header={
        <RecordPageHeader
          breadcrumb={[
            { label: tabLabel ?? displayText(messages.list_fallback), to: listHref },
            ...navTrailBreadcrumbItems(navTrailHops),
          ]}
          title={recordTitle}
          leading={favoriteButton}
          trailing={headerTrailing}
          nav={
            page ? (
              <RecordListNav
                objectName={objectName}
                recordId={recordId}
                layout={layout}
                pageApiName={pageApiName}
                tabApiName={tabApiName}
                tabLabel={tabLabel}
                objectLabel={displayText(page.object_label, page.object_api_name)}
                recordIndex={navState.recordIndex}
                recordTotal={navState.recordTotal}
                pageStart={navState.pageStart}
                pageRecordIds={navState.pageRecordIds}
                messages={page.messages}
                disabled={toolbarActionPending}
              />
            ) : undefined
          }
          actions={
            page ? (
              editing ? (
                editFormActions
              ) : (
                <RecordToolbar
                  vaultId={vaultId}
                  objectName={objectName}
                  recordId={recordId}
                  page={page}
                  layout={layout}
                  pageApiName={pageApiName}
                  isDocumentObject={isDocumentObject}
                  isDocumentSplit={isDocumentSplit}
                  isBinderTree={isBinderTree}
                  isBinderRecord={isBinderRecord}
                  tabApiName={tabApiName}
                  tabLabel={tabLabel}
                  recordDisplayName={recordDisplayNameValue}
                  recordIndex={navState.recordIndex}
                  recordTotal={navState.recordTotal}
                  pageRecordIds={navState.pageRecordIds}
                  onLifecycleAction={handleLifecycleAction}
                  onSdkAction={handleSdkAction}
                  onEdit={() => void enterEdit()}
                  editing={editing}
                  onDelete={() => void runDelete()}
                  deleting={deleting}
                  onChangeType={() => setChangeTypeOpen(true)}
                  lifecyclePending={toolbarActionPending}
                  onAuditOpen={() => setAuditOpen(true)}
                />
              )
            ) : undefined
          }
          stages={stagesBand}
          below={headerBelow}
        />
      }
      alerts={
        <>
          {page?.preview_mode && (
            <Alert type="info" title={displayText(page.messages.preview_readonly)} showIcon />
          )}
          {refreshing && (
            <Spin
              description={displayText(messages.refreshing_detail)}
              className="page-loading page__loading"
            />
          )}
          {error && <Alert type="error" title={error} showIcon role="alert" />}
          {editError && <Alert type="error" title={editError} showIcon role="alert" />}
          {editing && ruleError && <Alert type="warning" title={ruleError} showIcon />}
          {editing && evaluating && (
            <Alert
              type="info"
              showIcon
              title={displayText(defaultFormChrome.updating_rules)}
            />
          )}
          {showEditLoading && (
            <Spin
              description={displayText(defaultFormChrome.loading_form)}
              className="page-loading page__loading"
            />
          )}
          {loading && !page && (
            <Spin
              description={displayText(messages.loading_detail)}
              className="page-loading page__loading"
            />
          )}
          {!loading && !page && !error && (
            <Button type="text" onClick={() => navigate(-1)}>
              {displayText(shell.back)}
            </Button>
          )}
        </>
      }
      banner={workflowTaskBanner}
      body={recordBody}
    />
    {page?.audit.visible && (
      <RecordAuditModal
        open={auditOpen}
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        objectLabel={objectLabel ?? objectName ?? ""}
        recordDisplayName={recordDisplayNameValue}
        onClose={() => setAuditOpen(false)}
      />
    )}
    {page?.actions.change_type?.allowed && (
      <ChangeTypeModal
        open={changeTypeOpen}
        action={page.actions.change_type}
        objectLabel={objectLabel ?? objectName ?? ""}
        pending={toolbarActionPending}
        onCancel={() => setChangeTypeOpen(false)}
        onConfirm={(objectTypeName) => void beginChangeType(objectTypeName)}
      />
    )}
    {changeTypeWarning && (
      <ChangeTypeWarningModal
        open={changeTypeWarningOpen}
        warning={changeTypeWarning}
        objectLabel={objectLabel ?? objectName ?? ""}
        pending={changeTypePending}
        onCancel={() => {
          setChangeTypeWarningOpen(false);
          setChangeTypeWarning(null);
          setPendingChangeTypeName("");
        }}
        onConfirm={() => {
          if (pendingChangeTypeName) {
            void loadChangeTypeForm(pendingChangeTypeName);
          }
        }}
      />
    )}
    {dialogTarget && (
      <WorkflowStartModal
        open={workflowDialogAction != null}
        action={workflowDialogAction}
        page={dialogTarget.page}
        vaultId={vaultId ?? ""}
        objectName={dialogTarget.objectName}
        recordId={dialogTarget.recordId}
        values={workflowFieldValues}
        participantValues={workflowParticipantValues}
        dateValues={workflowDateValues}
        assignmentTypeValues={workflowAssignmentTypeValues}
        pending={lifecyclePending}
        onValuesChange={setWorkflowFieldValues}
        onParticipantValuesChange={setWorkflowParticipantValues}
        onDateValuesChange={setWorkflowDateValues}
        onAssignmentTypeValuesChange={setWorkflowAssignmentTypeValues}
        onCancel={cancelActionDialog}
        onConfirm={() => void confirmWorkflowDialog()}
      />
    )}
    {startNext ? (
      <StartNextWorkflowModal
        open
        workflowLabel={startNext.workflow_label}
        actions={startNext.actions}
        pending={lifecyclePending}
        onCancel={() => setStartNext(null)}
        onSelect={(action: LifecycleAction) => {
          setStartNext(null);
          handleLifecycleAction(action);
        }}
      />
    ) : null}
    <PreExecutionDialogModal
      open={preExecutionActionKind != null && preExecutionDialog != null}
      actionLabel={preExecutionActionLabel}
      actionName={preExecutionActionName}
      dialog={preExecutionDialog}
      values={preExecutionInputValues}
      pending={lifecyclePending}
      onValuesChange={setPreExecutionInputValues}
      onCancel={cancelActionDialog}
      onConfirm={() => void confirmPreExecutionDialog()}
    />
    </>
  );
}
