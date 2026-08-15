import { Alert, Button, Form, Modal, Spin } from "antd";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { api } from "../api/client";
import type { RecordFormModel } from "../api/types";
import { FormMetaProvider } from "../context/FormMetaContext";
import { useUi } from "../context/UiContext";
import { useLayoutRuleEffects } from "../hooks/useLayoutRuleEffects";
import { useLookupDisplays } from "../hooks/useLookupDisplays";
import {
  applyInlineCriteriaLocks,
  inlineCreateFixedFields,
  mergeInlineCreateValues,
} from "../lib/inlineReferenceCreate";
import { applyLayoutRuleEffects, visibleFormSections } from "../lib/layoutRules";
import { applyLookupDisplays } from "../lib/lookupForm";
import { defaultFormChrome, displayText, displayTextTemplate } from "../lib/i18n";
import {
  applyFieldValidationErrors,
  mapServerErrorToFieldErrors,
  scrollToFirstFieldError,
  validateRecordFormSections,
} from "../lib/recordFormValidation";
import { rememberReferencePlainLabel } from "../lib/studyScopeReference";
import { RecordFormSections } from "./record/RecordFormSections";

export type InlineReferenceCreated = {
  recordId: string;
  label: string;
};

type Props = {
  open: boolean;
  vaultId: string;
  targetObject: string;
  /** Prefer this object type for create (inherit parent for self-referential fields). */
  objectType?: string;
  /** Parent field relationship_criteria — used to fix Study etc. like Veeva. */
  relationshipCriteria?: string;
  /** Parent form field values for {{this.*}} criteria bindings. */
  sourceFieldValues?: Record<string, unknown>;
  /** Parent form display labels keyed by source field (e.g. study__clin → "s2"). */
  sourceFieldDisplays?: Record<string, string>;
  onCancel: () => void;
  onCreated: (created: InlineReferenceCreated) => void;
};

/**
 * Modal create form for Veeva create_object_inline: create a target object record
 * without leaving the parent create/edit form, then select it on the reference field.
 */
export function InlineReferenceCreateModal({
  open,
  vaultId,
  targetObject,
  objectType,
  relationshipCriteria,
  sourceFieldValues,
  sourceFieldDisplays,
  onCancel,
  onCreated,
}: Props) {
  const { shell } = useUi();
  const [form, setForm] = useState<RecordFormModel | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const formChrome = form?.chrome ?? defaultFormChrome;
  const formId = useId().replace(/:/g, "");

  // Depend on serialized source values — parent formValues identity changes every render.
  const sourceValuesKey = JSON.stringify(sourceFieldValues ?? {});
  const sourceDisplaysKey = JSON.stringify(sourceFieldDisplays ?? {});
  const fixedFields = useMemo(
    () =>
      inlineCreateFixedFields(
        relationshipCriteria,
        JSON.parse(sourceValuesKey) as Record<string, unknown>,
      ),
    [relationshipCriteria, sourceValuesKey],
  );
  const sourceDisplays = useMemo(
    () => JSON.parse(sourceDisplaysKey) as Record<string, string>,
    [sourceDisplaysKey],
  );

  const load = useCallback(async () => {
    if (!open || !vaultId || !targetObject) return;
    setLoading(true);
    setError(null);
    try {
      const model = await api.createForm(vaultId, targetObject, {
        objectType: objectType?.trim() || undefined,
      });
      const fixed = inlineCreateFixedFields(
        relationshipCriteria,
        JSON.parse(sourceValuesKey) as Record<string, unknown>,
      );
      setForm(model);
      setValues(mergeInlineCreateValues({ ...(model.values ?? {}) }, fixed));
      setFieldValidationErrors({});
    } catch (err) {
      setForm(null);
      setValues({});
      setError(err instanceof Error ? err.message : displayText(defaultFormChrome.load_form_failed));
    } finally {
      setLoading(false);
    }
  }, [open, vaultId, targetObject, objectType, relationshipCriteria, sourceValuesKey]);

  useEffect(() => {
    if (!open) {
      setForm(null);
      setValues({});
      setError(null);
      setFieldValidationErrors({});
      return;
    }
    void load();
  }, [open, load]);

  const { effects, evaluating, error: ruleError } = useLayoutRuleEffects({
    vaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    layoutApiName: form?.selected_layout.api_name,
    fieldValues: values,
    liveEvaluation: Array.isArray(form?.layout_rules) && form.layout_rules.length > 0,
    enabled: Boolean(form) && open,
  });

  const { displays: lookupDisplays } = useLookupDisplays({
    vaultId,
    objectApiName: form?.object_api_name,
    objectTypeApiName: form?.object_type_api_name,
    fieldValues: values,
    sections: form?.sections ?? [],
    enabled: Boolean(form) && open,
  });

  const displaySections = useMemo(() => {
    if (!form) return [];
    return visibleFormSections(
      applyFieldValidationErrors(
        applyLookupDisplays(
          applyInlineCriteriaLocks(
            applyLayoutRuleEffects(form.sections ?? [], effects),
            fixedFields,
            sourceDisplays,
          ),
          lookupDisplays,
        ),
        fieldValidationErrors,
      ),
    );
  }, [form, effects, lookupDisplays, fieldValidationErrors, fixedFields, sourceDisplays]);

  function updateField(name: string, value: unknown) {
    if (fixedFields.some((fixed) => fixed.field === name)) {
      return;
    }
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

  async function submitCreate() {
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
          : displayText(formChrome.validation_fix_fields ?? defaultFormChrome.validation_form_fields);
      setError(message);
      scrollToFirstFieldError(displaySections, validation.fieldErrors);
      return;
    }
    setFieldValidationErrors({});
    setSubmitting(true);
    setError(null);
    try {
      // Ensure criteria-fixed fields are always submitted even if layout hid them.
      const fields = mergeInlineCreateValues(values, fixedFields);
      const res = await api.submitCreate(vaultId, targetObject, {
        fields,
        form_guard: form.form_guard,
        object_type_name: form.object_type_api_name,
        form_context_token: form.form_context_token,
      });
      const recordId = String(res.record_id ?? "").trim();
      if (!recordId) {
        throw new Error(displayText(defaultFormChrome.load_form_failed));
      }
      const label = String(fields.name__v ?? "").trim() || recordId;
      rememberReferencePlainLabel(recordId, label);
      onCreated({ recordId, label });
    } catch (err) {
      const mapped = mapServerErrorToFieldErrors(
        displaySections,
        err instanceof Error ? err.message : "",
      );
      if (mapped) {
        setFieldValidationErrors(mapped);
        scrollToFirstFieldError(displaySections, mapped);
      }
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSubmitting(false);
    }
  }

  // Veeva create titles use the Object label, not the Object Type label.
  const objectLabel = form
    ? displayText(form.object_label, form.object_api_name)
    : targetObject;
  const title = displayTextTemplate(formChrome.create_title, { object: objectLabel });

  const footer = (
    <>
      <Button type="text" onClick={onCancel} disabled={submitting}>
        {displayText(shell.cancel)}
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        form={formId}
        loading={submitting}
        disabled={submitting || loading || !form || form.submit_blocked || evaluating}
      >
        {submitting ? displayText(formChrome.saving) : displayText(formChrome.submit_save)}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      className="inline-reference-create-modal related-section__create-modal related-section__create-modal--full"
      title={title}
      onCancel={onCancel}
      footer={footer}
      width={1080}
      destroyOnHidden
    >
      <FormMetaProvider
        objectApiName={form?.object_api_name ?? targetObject}
        objectTypeApiName={form?.object_type_api_name ?? objectType}
      >
        {error && (
          <Alert type="error" title={error} showIcon role="alert" className="related-section__create-error" />
        )}
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
              void submitCreate();
            }}
          >
            <RecordFormSections
              vaultId={vaultId}
              sections={displaySections}
              values={values}
              onFieldChange={updateField}
              recordIdPlaceholder={displayText(formChrome.record_id_placeholder)}
              displayContext={form.display_context}
            />
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
          </Form>
        )}
      </FormMetaProvider>
    </Modal>
  );
}
