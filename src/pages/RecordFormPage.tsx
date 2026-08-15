import { Alert, Button, message, Spin } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRelatedSectionVaultId } from "../hooks/useRelatedSectionVaultId";
import { api } from "../api/client";
import { handleStaleError } from "../lib/staleGuard";
import type { RecordFormModel, RelatedCreateFormModel, RecordPageModel } from "../api/types";
import { ObjectRecordPageShell } from "../components/record/ObjectRecordPageShell";
import { RecordFormSections } from "../components/record/RecordFormSections";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import { RecordPageBody, RecordPageShell } from "../components/record/RecordPageShell";
import {
  RecordSectionNav,
  shouldShowRecordSectionNav,
} from "../components/RecordSections";
import { scrollToRecordSection } from "../components/record/recordSectionUtils";
import { useLayoutRuleEffects } from "../hooks/useLayoutRuleEffects";
import { useLookupDisplays } from "../hooks/useLookupDisplays";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useUi } from "../context/UiContext";
import { FormMetaProvider } from "../context/FormMetaContext";
import { applyLayoutRuleEffects, visibleFormSections } from "../lib/layoutRules";
import { defaultFormChrome, displayText, displayTextTemplate } from "../lib/i18n";
import { getLastTab, type RecordNavState } from "../lib/vaultNav";
import {
  NAV_TRAIL_PARAM,
  decodeNavTrail,
  navTrailBackHref,
  navTrailBreadcrumbItems,
  withNavTrail,
} from "../lib/navTrail";
import {
  stashRelatedSectionSnapshot,
} from "../lib/relatedCreate";
import { useTabLabel } from "../lib/useTabLabel";
import { recordListHref } from "../lib/recordListHref";
import { prefillUserFieldsFromPerson } from "../lib/promotePersonForm";
import {
  applyDocumentFormReferenceOptions,
  isDocumentObjectClass,
} from "../lib/documentForm";
import {
  applyPicklistCascadeOptions,
  pruneInvalidPicklistValues,
} from "../lib/picklistForm";
import {
  applyFormPrefillDisplays,
  parseFormPrefillDisplays,
} from "../lib/formPrefill";
import { clearReferenceDependents } from "../lib/referenceForm";
import { applyLookupDisplays } from "../lib/lookupForm";
import {
  applyStudyCountryDerivedDisplays,
  fetchCountryDerivedFields,
  type StudyCountryDerivedDisplays,
} from "../lib/studyCountryForm";
import {
  applyStudySiteDerivedFromCountry,
  fetchStudyDerivedFromCountry,
  type StudySiteDerivedFromCountry,
} from "../lib/studySiteForm";
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

export function RecordFormPage() {
  const { objectName } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { shell } = useUi();
  const relatedSectionToken = searchParams.get("related_section_token") ?? undefined;
  const navTrailParam = searchParams.get(NAV_TRAIL_PARAM) ?? "";
  const navTrailHops = useMemo(() => decodeNavTrail(navTrailParam), [navTrailParam]);
  // `return_to` is the legacy single-hop param, kept as a fallback for links built before nav trails.
  const returnTo = navTrailBackHref(navTrailHops) ?? searchParams.get("return_to") ?? undefined;
  const binderIdParam = searchParams.get("binder_id") ?? undefined;
  const binderSectionIdParam = searchParams.get("binder_section_id") ?? undefined;
  const binderPrefills = useMemo(() => {
    const out: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith("prefill.") && value) {
        out[key.slice("prefill.".length)] = value;
      }
    });
    return out;
  }, [searchParams]);
  const binderPrefillDisplays = useMemo(
    () => parseFormPrefillDisplays(searchParams),
    [searchParams],
  );
  const isRelatedCreate = Boolean(relatedSectionToken);
  const effectiveVaultId = useRelatedSectionVaultId(relatedSectionToken);
  const [form, setForm] = useState<RecordFormModel | RelatedCreateFormModel | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const [sectionNavCollapsed, setSectionNavCollapsed] = useState(false);
  const [countryDerived, setCountryDerived] = useState<StudyCountryDerivedDisplays>({});
  const [studySiteDerived, setStudySiteDerived] = useState<StudySiteDerivedFromCountry>({});
  const formValuesInitializedRef = useRef(false);
  const chrome = form?.chrome ?? defaultFormChrome;

  const layoutParam = searchParams.get("layout") ?? undefined;
  const pageParam = searchParams.get("page") ?? undefined;
  const objectTypeParam = searchParams.get("object_type") ?? undefined;
  const copyFromParam = searchParams.get("copy_from") ?? undefined;
  const promoteFromParam = searchParams.get("promote_from") ?? undefined;
  const lifecycleActionParam = searchParams.get("lifecycle_action") ?? undefined;
  const isPromoteCreate =
    objectName === "user__sys" &&
    Boolean(promoteFromParam?.trim()) &&
    Boolean(lifecycleActionParam?.trim());
  const [promotePersonPage, setPromotePersonPage] = useState<RecordPageModel | null>(null);

  const load = useCallback(async (opts?: { resetValues?: boolean }) => {
    if (!effectiveVaultId || !objectName) return;
    const resetValues = opts?.resetValues ?? !formValuesInitializedRef.current;
    setLoading(true);
    setError(null);
    try {
      const model =
        isRelatedCreate && relatedSectionToken
          ? await api.loadRelatedCreateForm(effectiveVaultId, {
              section_context_token: relatedSectionToken,
              object_type_name: objectTypeParam,
            })
          : await api.createForm(effectiveVaultId, objectName, {
              objectType: objectTypeParam,
              layout: layoutParam,
              copyFrom: copyFromParam,
              page: pageParam,
            });
      setForm(model);
      setFieldValidationErrors({});
      if (resetValues) {
        let nextValues = { ...(model.values ?? {}) };
        if (isPromoteCreate && promoteFromParam) {
          const personPage = await api.recordPage(effectiveVaultId, "person__sys", promoteFromParam);
          setPromotePersonPage(personPage);
          nextValues = {
            ...nextValues,
            ...prefillUserFieldsFromPerson(personPage),
            source_person_id__v: promoteFromParam,
          };
        } else {
          setPromotePersonPage(null);
        }
        for (const [field, value] of Object.entries(binderPrefills)) {
          const current = nextValues[field];
          if (current === undefined || current === null || current === "") {
            nextValues[field] = value;
          }
        }
        setValues(nextValues);
        setInitialValues(nextValues);
        formValuesInitializedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(defaultFormChrome.load_form_failed));
    } finally {
      setLoading(false);
    }
  }, [
    effectiveVaultId,
    objectName,
    isRelatedCreate,
    relatedSectionToken,
    layoutParam,
    objectTypeParam,
    copyFromParam,
    pageParam,
    isPromoteCreate,
    promoteFromParam,
    binderPrefills,
  ]);

  useEffect(() => {
    formValuesInitializedRef.current = false;
    void load({ resetValues: true });
  }, [effectiveVaultId, objectName, isRelatedCreate, relatedSectionToken, layoutParam, objectTypeParam, copyFromParam, pageParam, isPromoteCreate, promoteFromParam, lifecycleActionParam]);

  useEffect(() => {
    if (!effectiveVaultId || form?.object_api_name !== "study_country__v") {
      setCountryDerived({});
      return;
    }
    const countryId = String(values.country__v ?? "").trim();
    if (!countryId) {
      setCountryDerived({});
      return;
    }
    let cancelled = false;
    void fetchCountryDerivedFields(effectiveVaultId, countryId)
      .then((derived) => {
        if (!cancelled) setCountryDerived(derived);
      })
      .catch(() => {
        if (!cancelled) setCountryDerived({});
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveVaultId, form?.object_api_name, values.country__v]);

  useEffect(() => {
    if (!effectiveVaultId || form?.object_api_name !== "site__v") {
      setStudySiteDerived({});
      return;
    }
    const studyCountryId = String(values.study_country__v ?? "").trim();
    if (!studyCountryId) {
      setStudySiteDerived({});
      setValues((prev) => {
        if (!prev.study__v) {
          return prev;
        }
        return { ...prev, study__v: "" };
      });
      return;
    }
    let cancelled = false;
    void fetchStudyDerivedFromCountry(effectiveVaultId, studyCountryId)
      .then((derived) => {
        if (cancelled) {
          return;
        }
        setStudySiteDerived(derived);
        if (!derived.study__v) {
          return;
        }
        setValues((prev) => {
          if (String(prev.study__v ?? "") === derived.study__v) {
            return prev;
          }
          return { ...prev, study__v: derived.study__v };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStudySiteDerived({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveVaultId, form?.object_api_name, values.study_country__v]);

  const { effects, error: ruleError } = useLayoutRuleEffects({
    vaultId: effectiveVaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    layoutApiName: form?.selected_layout?.api_name,
    fieldValues: values,
    liveEvaluation: Array.isArray(form?.layout_rules) && form.layout_rules.length > 0,
    enabled: Boolean(form),
  });

  const { displays: lookupDisplays } = useLookupDisplays({
    vaultId: effectiveVaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    fieldValues: values,
    sections: form?.sections ?? [],
    enabled: Boolean(form),
  });

  const displaySections = useMemo(() => {
    if (!form) return [];
    let sections = applyLayoutRuleEffects(form.sections ?? [], effects);
    if (isDocumentObjectClass(form.object_class)) {
      sections = applyDocumentFormReferenceOptions(sections, form.document, values);
    }
    sections = applyPicklistCascadeOptions(sections, values);
    if (form.object_api_name === "study_country__v") {
      sections = applyStudyCountryDerivedDisplays(sections, countryDerived);
    }
    if (form.object_api_name === "site__v") {
      sections = applyStudySiteDerivedFromCountry(sections, studySiteDerived);
    }
    sections = applyLookupDisplays(sections, lookupDisplays);
    sections = applyFormPrefillDisplays(sections, binderPrefillDisplays, values);
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
  }, [form, effects, values, values.language__sys, values.type__v, values.subtype__v, countryDerived, studySiteDerived, lookupDisplays, binderPrefillDisplays, fieldValidationErrors]);

  const isDirty = useMemo(
    () => Boolean(form) && JSON.stringify(values) !== JSON.stringify(initialValues),
    [form, values, initialValues],
  );
  useUnsavedChangesGuard(isDirty && !submitting);

  const isDocumentSplit = form?.page_shell?.kind === "document_split";
  const showSectionNav = !isDocumentSplit && shouldShowRecordSectionNav(displaySections);
  const recordBodyClass = [
    "record-page__body",
    showSectionNav && !sectionNavCollapsed ? "record-page__body--with-nav" : "",
    showSectionNav && sectionNavCollapsed ? "record-page__body--nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const navState = (location.state as RecordNavState | null) ?? {};
  const tabApiName =
    searchParams.get("tab") ?? navState.tabApiName ?? (effectiveVaultId ? getLastTab(effectiveVaultId) : undefined);
  const tabLabel = useTabLabel(tabApiName, navState.tabLabel);
  const listHref = recordListHref(tabApiName);
  const layoutQueryParam = layoutParam;
  const pageQueryParam = pageParam ?? form?.page_shell?.page_api_name;

  function buildRecordQuery(params: { tab?: string; layout?: string; page?: string }) {
    const q = new URLSearchParams();
    if (params.tab) q.set("tab", params.tab);
    if (params.layout) q.set("layout", params.layout);
    if (params.page) q.set("page", params.page);
    const suffix = q.toString();
    return suffix ? `?${suffix}` : "";
  }

  /**
   * Innermost origin of this create form when the server knows it (promote source,
   * related-section parent). It sits below the nav trail, which holds its ancestors.
   */
  function resolveOriginCrumb(): { label: string; to: string } | undefined {
    const recordCrumb = (objectApiName: string, recordId: string, label: string) => ({
      label,
      to: withNavTrail(
        `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}${buildRecordQuery({ tab: tabApiName })}`,
        navTrailParam,
      ),
    });
    if (isPromoteCreate && promoteFromParam) {
      return recordCrumb(
        "person__sys",
        promoteFromParam,
        displayText(promotePersonPage?.record_name, promoteFromParam),
      );
    }
    const relatedParent = isRelatedCreate ? (form as RelatedCreateFormModel | null) : null;
    if (relatedParent?.parent_record_id && relatedParent.parent_object_api_name) {
      return recordCrumb(
        relatedParent.parent_object_api_name,
        relatedParent.parent_record_id,
        displayText(relatedParent.parent_record_label, relatedParent.parent_record_id),
      );
    }
    return undefined;
  }

  const originCrumb = resolveOriginCrumb();
  const backHref = originCrumb?.to ?? returnTo;

  if (!effectiveVaultId || !objectName) {
    return null;
  }

  const resolvedVaultId = effectiveVaultId;
  const resolvedObjectName = objectName;

  function scrollToSection(sectionId: string) {
    scrollToRecordSection(sectionId);
  }

  function navigateAfterSave(savedRecordId: string) {
    // Carry the trail onto the new record so its breadcrumb still leads back to the origin.
    navigate(
      withNavTrail(
        `/objects/${encodeURIComponent(resolvedObjectName)}/records/${encodeURIComponent(savedRecordId)}${buildRecordQuery({ tab: tabApiName, layout: layoutQueryParam, page: pageQueryParam })}`,
        navTrailParam,
      ),
    );
  }

  function handleCancel() {
    navigate(backHref ?? listHref);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    await saveRecord(false);
  }

  async function onSaveAndCreate() {
    if (!form) return;
    await saveRecord(true);
  }

  async function saveRecord(createAnother: boolean) {
    if (!form) return;
    const validation = validateRecordFormSections(
      displaySections,
      values,
      chrome.field_required ?? defaultFormChrome.field_required,
      { invalidEmailMessage: chrome.field_invalid_email ?? defaultFormChrome.field_invalid_email },
    );
    if (!validation.valid) {
      setFieldValidationErrors(validation.fieldErrors);
      const errorCount = Object.keys(validation.fieldErrors).length;
      setError(
        errorCount === 1 && validation.firstErrorMessage
          ? validation.firstErrorMessage
          : displayText(chrome.validation_fix_fields ?? defaultFormChrome.validation_fix_fields),
      );
      scrollToFirstFieldError(displaySections, validation.fieldErrors);
      return;
    }
    setFieldValidationErrors({});
    setSubmitting(true);
    setError(null);
    try {
      if (isRelatedCreate && relatedSectionToken) {
        const result = await api.createRelatedSection(resolvedVaultId, {
          section_context_token: relatedSectionToken,
          fields: values,
          form_guard: form.form_guard,
          object_type_name: searchParams.get("object_type") ?? form.object_type_api_name,
        });
        stashRelatedSectionSnapshot(relatedSectionToken, result.section);
        if (createAnother) {
          message.success(displayText(chrome.record_created, defaultFormChrome.record_created.text));
          formValuesInitializedRef.current = false;
          await load({ resetValues: true });
          return;
        }
        navigate(backHref ?? listHref, { state: { recordPageRefresh: true } });
        return;
      }
      if (isPromoteCreate && promoteFromParam && lifecycleActionParam) {
        const personPage =
          promotePersonPage ??
          (await api.recordPage(resolvedVaultId, "person__sys", promoteFromParam));
        const promoteAction = personPage.lifecycle_actions?.find(
          (action) => action.name === lifecycleActionParam,
        );
        await api.lifecycleTransition(resolvedVaultId, "person__sys", promoteFromParam, {
          action: lifecycleActionParam,
          action_guard: {
            schema_fingerprint: personPage.schema_fingerprint,
            ui_fingerprint: personPage.ui_fingerprint,
            record_version: personPage.record_version,
          },
          layout: personPage.selected_layout.api_name,
          user_input_fields: values,
        });
        message.success(
          displayText(promoteAction?.label, promoteAction?.name ?? lifecycleActionParam),
        );
        navigate(
          backHref ??
            `/objects/person__sys/records/${encodeURIComponent(promoteFromParam)}${buildRecordQuery({ tab: tabApiName })}`,
          { state: { recordPageRefresh: true } },
        );
        return;
      }
      const payload = {
        fields: values,
        object_type_name: form.object_type_api_name,
        form_guard: form.form_guard,
        form_context_token: form.form_context_token,
      };
      const result = await api.submitCreate(resolvedVaultId, resolvedObjectName, payload);
      if (createAnother) {
        // Save + Create: keep the user on the create page with a fresh blank
        // form so they can rapidly add the next record (matches Veeva's
        // "button_save_and_create" behaviour).
        message.success(displayText(chrome.record_created, defaultFormChrome.record_created.text));
        formValuesInitializedRef.current = false;
        await load({ resetValues: true });
      } else if (binderIdParam && binderSectionIdParam) {
        try {
          await api.binderAddDocuments(resolvedVaultId, binderIdParam, {
            section_id: binderSectionIdParam,
            document_ids: [result.record_id],
          });
        } catch (linkErr) {
          message.warning(
            linkErr instanceof Error
              ? linkErr.message
              : "Document created, but linking into the Binder section failed.",
          );
        }
        message.success(displayText(chrome.record_created, defaultFormChrome.record_created.text));
        navigate(
          backHref ??
            `/objects/document__v/records/${encodeURIComponent(binderIdParam)}${buildRecordQuery({ tab: tabApiName })}`,
          { state: { recordPageRefresh: true } },
        );
      } else {
        navigateAfterSave(result.record_id);
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
      await handleStaleError(
        err,
        () => {
          formValuesInitializedRef.current = false;
          return load({ resetValues: true });
        },
        setError,
        displayText(shell.save_failed),
        shell,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(name: string, raw: unknown) {
    setFieldValidationErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setValues((prev) => {
      let updated = { ...prev, [name]: raw };
      updated = pruneInvalidPicklistValues(updated, form?.sections ?? [], name);
      updated = clearReferenceDependents(updated, form?.sections ?? [], name);
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
      return updated;
    });
  }

  // Veeva create titles use the Object label, not the Object Type label.
  const objectLabel = form
    ? displayText(form.object_label, form.object_api_name ?? objectName ?? "")
    : "";
  const createObjectLabel = objectLabel;
  const copyFrom = copyFromParam;
  const promoteActionLabel = isPromoteCreate
    ? promotePersonPage?.lifecycle_actions?.find((action) => action.name === lifecycleActionParam)
        ?.label
    : undefined;
  const title = isPromoteCreate
    ? displayText(promoteActionLabel, lifecycleActionParam ?? "Promote to User")
    : copyFrom || form?.mode === "copy"
      ? displayText(chrome.copy_title)
      : displayTextTemplate(chrome.create_title, { object: createObjectLabel });

  const breadcrumbItems: { label: string; to?: string }[] = [
    { label: tabLabel ?? displayText(chrome.list_fallback), to: listHref },
    ...navTrailBreadcrumbItems(navTrailHops),
    ...(originCrumb ? [originCrumb] : []),
  ];

  const formBody = form ? (
    <RecordPageBody
      className={recordBodyClass}
      mainClassName={isDocumentSplit ? "record-page__main--document-split" : undefined}
      sectionNav={
        showSectionNav ? (
          <RecordSectionNav
            sections={displaySections}
            ariaLabel={displayText(chrome.section_nav_aria)}
            onNavigate={scrollToSection}
            collapsed={sectionNavCollapsed}
            onToggleCollapse={() => setSectionNavCollapsed((prev) => !prev)}
            collapseLabel={displayText(chrome.collapse_section_nav)}
            expandLabel={displayText(chrome.expand_section_nav)}
          />
        ) : undefined
      }
    >
      <ObjectRecordPageShell
        shell={form.page_shell}
        vaultId={resolvedVaultId}
        objectApiName={resolvedObjectName}
      >
        <form id="record-create-form" className="record-form record-form--create" onSubmit={onSubmit}>
          <FormMetaProvider
            objectApiName={form.object_api_name}
            objectTypeApiName={form.object_type_api_name}
          >
            <RecordFormSections
              vaultId={resolvedVaultId}
              sections={displaySections}
              values={values}
              onFieldChange={updateField}
              recordIdPlaceholder={displayText(chrome.record_id_placeholder)}
              displayContext={form.display_context}
              localeReferencesByLanguage={form.l10n?.locale_references_by_language}
              relatedAfterSaveHint={
                isRelatedCreate
                  ? undefined
                  : displayText(chrome.related_after_save, defaultFormChrome.related_after_save.text)
              }
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
      </ObjectRecordPageShell>
    </RecordPageBody>
  ) : undefined;

  const formActions = form ? (
    <div className="page-header__actions">
      <Button type="text" onClick={handleCancel}>
        {displayText(shell.cancel)}
      </Button>
      {!isPromoteCreate ? (
        <Button
          loading={submitting}
          disabled={submitting || form.submit_blocked}
          onClick={onSaveAndCreate}
        >
          {submitting ? displayText(chrome.saving) : displayText(chrome.submit_save_create)}
        </Button>
      ) : null}
      <Button
        type="primary"
        htmlType="submit"
        form="record-create-form"
        loading={submitting}
        disabled={submitting || form.submit_blocked}
      >
        {submitting
          ? displayText(chrome.saving)
          : isPromoteCreate
            ? title
            : displayText(chrome.submit_save)}
      </Button>
    </div>
  ) : undefined;

  return (
    <RecordPageShell
      header={
        <RecordPageHeader
          breadcrumb={breadcrumbItems}
          title={title}
          actions={formActions}
        />
      }
      alerts={
        <>
          {error && <Alert type="error" title={error} showIcon role="alert" />}
          {ruleError && <Alert type="warning" title={ruleError} showIcon />}
          {loading && !form && (
            <Spin description={displayText(chrome.loading_form)} className="page-loading page__loading" />
          )}
        </>
      }
      body={formBody}
    />
  );
}
