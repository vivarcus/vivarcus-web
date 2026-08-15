import { Alert, Button, Form, Modal, Spin, message } from "antd";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { RelatedCreateFormModel, RelatedSectionModel } from "../api/types";
import { useUi } from "../context/UiContext";
import { useLayoutRuleEffects } from "../hooks/useLayoutRuleEffects";
import { useLookupDisplays } from "../hooks/useLookupDisplays";
import { applyLayoutRuleEffects, visibleFormSections } from "../lib/layoutRules";
import { applyLookupDisplays } from "../lib/lookupForm";
import { defaultFormChrome, defaultRelatedChrome, displayText, displayTextTemplate } from "../lib/i18n";
import {
  applyFieldValidationErrors,
  mapServerErrorToFieldErrors,
  scrollToFirstFieldError,
  validateRecordFormSections,
} from "../lib/recordFormValidation";
import { useRelatedSectionVaultId } from "../hooks/useRelatedSectionVaultId";
import { FormMetaProvider } from "../context/FormMetaContext";
import { RecordFormSections } from "./record/RecordFormSections";

type Props = {
  vaultId?: string;
  sectionToken: string;
  objectTypeName?: string;
  modal?: boolean;
  chrome?: typeof defaultRelatedChrome;
  onCreated: (section: RelatedSectionModel, createAnother?: boolean) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export function RelatedCreateFormPanel({
  sectionToken,
  objectTypeName,
  modal = false,
  chrome = defaultRelatedChrome,
  onCreated,
  onCancel,
  onError,
}: Props) {
  const effectiveVaultId = useRelatedSectionVaultId(sectionToken);
  const { shell } = useUi();
  const [form, setForm] = useState<RelatedCreateFormModel | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const formChrome = form?.chrome ?? defaultFormChrome;
  const formId = useId().replace(/:/g, "");
  // Parent often passes an inline onError that changes when it setStates; keep a ref so
  // reporting errors does not recreate `load` and wipe the just-shown submit error.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    onErrorRef.current("");
    try {
      const model = await api.loadRelatedCreateForm(effectiveVaultId, {
        section_context_token: sectionToken,
        object_type_name: objectTypeName,
      });
      setForm(model);
      setValues({ ...(model.values ?? {}) });
      setFieldValidationErrors({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : displayText(defaultRelatedChrome.create_failed);
      setError(message);
      onErrorRef.current(message);
    } finally {
      setLoading(false);
    }
  }, [effectiveVaultId, sectionToken, objectTypeName]);

  useEffect(() => {
    void load();
  }, [load]);

  const { effects, evaluating, error: ruleError } = useLayoutRuleEffects({
    vaultId: effectiveVaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    layoutApiName: form?.selected_layout.api_name,
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
    return visibleFormSections(
      applyFieldValidationErrors(
        applyLookupDisplays(
          applyLayoutRuleEffects(form.sections ?? [], effects),
          lookupDisplays,
        ),
        fieldValidationErrors,
      ),
    );
  }, [form, effects, lookupDisplays, fieldValidationErrors]);

  function updateField(name: string, value: unknown) {
    setFieldValidationErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function submitCreate(createAnother: boolean) {
    if (!form) return;
    const validation = validateRecordFormSections(
      displaySections,
      values,
      formChrome.field_required ?? defaultFormChrome.field_required,
      {
        invalidEmailMessage:
          formChrome.field_invalid_email ?? defaultFormChrome.field_invalid_email,
      },
    );
    if (!validation.valid) {
      setFieldValidationErrors(validation.fieldErrors);
      const errorCount = Object.keys(validation.fieldErrors).length;
      const message =
        errorCount === 1 && validation.firstErrorMessage
          ? validation.firstErrorMessage
          : displayText(formChrome.validation_fix_fields ?? defaultFormChrome.validation_fix_fields);
      setError(message);
      onErrorRef.current(message);
      scrollToFirstFieldError(displaySections, validation.fieldErrors);
      return;
    }
    setFieldValidationErrors({});
    setSubmitting(true);
    setError(null);
    onErrorRef.current("");
    try {
      const res = await api.createRelatedSection(effectiveVaultId, {
        section_context_token: sectionToken,
        fields: values,
        form_guard: form.form_guard,
        object_type_name: objectTypeName ?? form.object_type_api_name,
      });
      onCreated(res.section, createAnother);
      if (createAnother) {
        message.success(displayText(formChrome.record_created, defaultFormChrome.record_created.text));
        await load();
        return;
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
      const message =
        err instanceof Error ? err.message : displayText(chrome.create_failed);
      setError(message);
      onErrorRef.current(message);
    } finally {
      setSubmitting(false);
    }
  }

  const formActions =
    form && !loading ? (
      <>
        <Button type="text" onClick={onCancel} disabled={submitting}>
          {displayText(chrome.cancel)}
        </Button>
        <Button
          loading={submitting}
          disabled={submitting || form.submit_blocked || evaluating}
          onClick={() => void submitCreate(true)}
        >
          {submitting ? displayText(formChrome.saving) : displayText(formChrome.submit_save_create)}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          form={modal ? formId : undefined}
          loading={submitting}
          disabled={submitting || form.submit_blocked || evaluating}
        >
          {submitting ? displayText(formChrome.saving) : displayText(formChrome.submit_save)}
        </Button>
      </>
    ) : null;

  const body = (
    <>
      {error && <Alert type="error" title={error} showIcon role="alert" className="related-section__create-error" />}
      {ruleError && <Alert type="warning" title={ruleError} showIcon />}
      {loading && (
        <Spin description={displayText(formChrome.loading_form)} className="related-section__loading" />
      )}
      {!loading && form && (
        <Form
          id={formId}
          layout="vertical"
          requiredMark={false}
          onFinish={() => {
            void submitCreate(false);
          }}
        >
          <FormMetaProvider
            objectApiName={form.object_api_name}
            objectTypeApiName={form.object_type_api_name ?? objectTypeName}
          >
            <RecordFormSections
              vaultId={effectiveVaultId}
              sections={displaySections}
              values={values}
              onFieldChange={updateField}
              chrome={formChrome}
              recordIdPlaceholder={displayText(formChrome.record_id_placeholder)}
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
          {!modal && <div className="form-actions">{formActions}</div>}
        </Form>
      )}
    </>
  );

  if (modal) {
    // Veeva create titles use the Object label (e.g. "Create Study Communication Log"),
    // not the Object Type label ("Site Communication" / "Other Communication").
    const createLabel = form
      ? displayText(form.object_label, form.object_api_name)
      : displayText(chrome.create_related);
    return (
      <Modal
        open
        className="related-section__create-modal related-section__create-modal--full"
        title={displayTextTemplate(formChrome.create_title, { object: createLabel })}
        onCancel={onCancel}
        footer={formActions}
        width={1080}
      >
        {body}
      </Modal>
    );
  }

  return <div className="related-section__create related-section__create--full">{body}</div>;
}
