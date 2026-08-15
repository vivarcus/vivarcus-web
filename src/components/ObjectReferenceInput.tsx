import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { api } from "../api/client";
import { useUi } from "../context/UiContext";
import { formatReferenceLabel } from "../lib/fields";
import { displayText, displayTextTemplate } from "../lib/i18n";
import {
  appendReferenceCriteriaToVql,
  pickSourceValuesForCriteria,
  relationshipCriteriaSourceFields,
} from "../lib/referenceCriteria";
import {
  filterStudyScopeReferenceRecords,
  formatControllingFieldReferenceLabel,
  dependsOnControllingFieldHint,
  rememberReferencePlainLabel,
  referenceRecordByIdQuery,
  resolveEffectiveReferenceCriteria,
  studyScopeReferenceQuery,
} from "../lib/studyScopeReference";
import { InlineReferenceCreateModal } from "./InlineReferenceCreateModal";

type Option = {
  recordId: string;
  label: string;
};

type Props = {
  vaultId: string;
  targetObject: string;
  value: unknown;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  label: string;
  showLabel?: boolean;
  displayLabel?: string;
  presetOptions?: Option[];
  relationshipCriteria?: string;
  controllingFieldApiName?: string;
  sourceFieldValues?: Record<string, unknown>;
  formFieldDisplays?: Record<string, string>;
  formFieldLabels?: Record<string, string>;
  controllingParents?: Record<string, string>;
  emptyHint?: string;
  /** Veeva create_object_inline — show "+ Create {Object}" in the dropdown. */
  createObjectInline?: boolean;
  /** Prefer this object type when opening inline create (e.g. inherit parent type). */
  createObjectType?: string;
  /** Localized target object label for the create action (preferred over api_name humanization). */
  targetObjectLabel?: string;
};

/** Stable empty maps — avoid `?? {}` in render (new identity retriggers VQL load effect). */
const EMPTY_STRING_MAP: Record<string, string> = {};
const EMPTY_UNKNOWN_MAP: Record<string, unknown> = {};

/**
 * Ensures the currently selected record always has a readable label in the
 * dropdown, even when it is missing from the loaded/preset option list (e.g.
 * an inactive record, or a value held across a cascading parent change). The
 * label falls back to the server-provided display value, then the raw id.
 */
export function mergeReferenceOptions(
  options: Option[],
  current: string,
  displayLabel?: string,
): Option[] {
  if (!current || options.some((o) => o.recordId === current)) {
    return options;
  }
  const fallback = formatReferenceLabel(current, displayLabel);
  return [...options, { recordId: current, label: fallback || current }];
}

/** Prefer a human object label for "+ Create {object}" when only api_name is known. */
export function formatReferenceCreateObjectLabel(targetObject: string): string {
  const raw = targetObject.trim();
  if (!raw) return raw;
  const stripped = raw.replace(/__(v|c|sys|clin|ctms)$/i, "").replace(/_/g, " ");
  return stripped.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function ObjectReferenceInput({
  vaultId,
  targetObject,
  value,
  onChange,
  disabled,
  required,
  label,
  showLabel = true,
  displayLabel,
  presetOptions,
  relationshipCriteria,
  controllingFieldApiName,
  sourceFieldValues,
  formFieldDisplays,
  formFieldLabels,
  controllingParents,
  emptyHint,
  createObjectInline = false,
  createObjectType,
  targetObjectLabel,
}: Props) {
  const { shell } = useUi();
  const [remoteOptions, setRemoteOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdOption, setCreatedOption] = useState<Option | null>(null);
  const [resolvedCurrentLabel, setResolvedCurrentLabel] = useState("");

  const current = String(value ?? "");
  const effectiveDisplayLabel = displayLabel?.trim() || resolvedCurrentLabel.trim() || undefined;
  const isPreset = presetOptions != null;
  const allowInlineCreate = createObjectInline && !disabled && !isPreset && Boolean(targetObject.trim());
  const createObjectDisplayLabel =
    targetObjectLabel?.trim() || formatReferenceCreateObjectLabel(targetObject);
  const criteria = resolveEffectiveReferenceCriteria(
    targetObject,
    relationshipCriteria,
    controllingFieldApiName,
  );
  const sourceValues = sourceFieldValues ?? EMPTY_UNKNOWN_MAP;
  const fieldLabels = formFieldLabels ?? EMPTY_STRING_MAP;
  // Serialize each render so effect deps compare by value, not object identity.
  const sourceValuesKey = JSON.stringify(sourceValues);
  const criteriaSourceValues = useMemo(
    () =>
      criteria
        ? pickSourceValuesForCriteria(criteria, JSON.parse(sourceValuesKey) as Record<string, unknown>)
        : EMPTY_UNKNOWN_MAP,
    [criteria, sourceValuesKey],
  );
  const criteriaSourceKey = useMemo(() => JSON.stringify(criteriaSourceValues), [criteriaSourceValues]);
  const displays = formFieldDisplays ?? EMPTY_STRING_MAP;
  const parents = controllingParents ?? EMPTY_STRING_MAP;
  const displayContextKey = useMemo(
    () => JSON.stringify({ displays, parents }),
    [displays, parents],
  );

  const blockedByCriteria = useMemo(() => {
    if (!criteria || isPreset) {
      return false;
    }
    const requiredSources = relationshipCriteriaSourceFields(criteria);
    return requiredSources.some(
      (field) => !String(criteriaSourceValues[field] ?? "").trim(),
    );
  }, [criteria, criteriaSourceKey, criteriaSourceValues, isPreset]);

  const blockedByControllingField = useMemo(() => {
    const controller = controllingFieldApiName?.trim() ?? "";
    if (!controller) {
      return false;
    }
    // Apply for preset (document Type/Subtype) and remote pickers alike.
    return !String(criteriaSourceValues[controller] ?? sourceValues[controller] ?? "").trim();
  }, [controllingFieldApiName, criteriaSourceKey, criteriaSourceValues, sourceValuesKey, sourceValues]);

  // Veeva: empty controlled reference fields show "Depends on {Controlling Field Label}"
  // both while gated and after the parent is selected (until a value is chosen).
  const dependsOnHint = useMemo(
    () =>
      dependsOnControllingFieldHint(
        displayText(shell.depends_on_field),
        controllingFieldApiName,
        fieldLabels,
      ),
    [shell.depends_on_field, controllingFieldApiName, fieldLabels],
  );

  const baseOptions = useMemo(() => {
    const list = isPreset ? presetOptions! : remoteOptions;
    if (!createdOption) {
      return list;
    }
    if (list.some((o) => o.recordId === createdOption.recordId)) {
      return list;
    }
    return [createdOption, ...list];
  }, [isPreset, presetOptions, remoteOptions, createdOption]);

  useEffect(() => {
    if (displayLabel && current) {
      rememberReferencePlainLabel(current, displayLabel);
    }
  }, [current, displayLabel]);

  useEffect(() => {
    setResolvedCurrentLabel("");
  }, [current, displayLabel]);

  useEffect(() => {
    if (!current || isPreset || displayLabel?.trim()) {
      return;
    }
    if (baseOptions.some((option) => option.recordId === current)) {
      return;
    }
    const query = referenceRecordByIdQuery(targetObject, current);
    if (!query) {
      return;
    }
    let cancelled = false;
    void api
      .vqlQuery(vaultId, { query })
      .then((res) => {
        if (cancelled) {
          return;
        }
        const row = res.records?.[0];
        const recordId = String(row?.record_id ?? row?.fields?.id ?? "").trim();
        if (recordId !== current) {
          return;
        }
        const name = String(row?.fields?.name__v ?? "").trim();
        if (!name || name === current) {
          return;
        }
        rememberReferencePlainLabel(current, name);
        setResolvedCurrentLabel(name);
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedCurrentLabel("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, targetObject, current, isPreset, displayLabel, baseOptions]);

  useEffect(() => {
    if (isPreset) {
      setRemoteOptions([]);
      setError(null);
      return;
    }
    if (blockedByCriteria || blockedByControllingField) {
      setRemoteOptions([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const resolvedSourceValues = JSON.parse(sourceValuesKey) as Record<string, unknown>;
    const resolvedDisplays = JSON.parse(displayContextKey) as {
      displays: Record<string, string>;
      parents: Record<string, string>;
    };
    const baseQuery = studyScopeReferenceQuery(targetObject);
    // Never fall back to an unfiltered query when criteria cannot be applied —
    // that would list Study Countries / Sites from other Studies.
    const query =
      criteria.length > 0
        ? appendReferenceCriteriaToVql(baseQuery, criteria, resolvedSourceValues)
        : baseQuery;
    if (query == null) {
      setRemoteOptions([]);
      setError(null);
      setLoading(false);
      return;
    }
    api.vqlQuery(vaultId, { query })
      .then((res) => {
        if (cancelled) return;
        const visible = filterStudyScopeReferenceRecords(targetObject, res.records ?? []);
        const next = visible
          .map((row) => {
            const recordId = String(row.record_id ?? row.fields?.id ?? "");
            const name = String(row.fields?.name__v ?? "").trim();
            rememberReferencePlainLabel(recordId, name || recordId);
            const optionLabel = formatControllingFieldReferenceLabel(
              name,
              recordId,
              controllingFieldApiName,
              resolvedDisplays.parents,
              resolvedDisplays.displays,
              resolvedSourceValues,
            );
            return { recordId, label: formatReferenceLabel(recordId, optionLabel) };
          })
          .filter((o) => o.recordId);
        setRemoteOptions(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setRemoteOptions([]);
        setError(err instanceof Error ? err.message : displayText(shell.reference_load_failed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Depend on serialized keys only — object identity of formValues / empty maps must not re-fetch.
  }, [
    vaultId,
    targetObject,
    isPreset,
    criteria,
    criteriaSourceKey,
    sourceValuesKey,
    blockedByCriteria,
    blockedByControllingField,
    controllingFieldApiName,
    displayContextKey,
    shell.reference_load_failed,
  ]);

  const options = useMemo(
    () => mergeReferenceOptions(baseOptions, current, effectiveDisplayLabel),
    [baseOptions, current, effectiveDisplayLabel],
  );

  const criteriaEmptyHint =
    (blockedByCriteria || blockedByControllingField) &&
    (relationshipCriteriaSourceFields(criteria).length > 0 || controllingFieldApiName)
      ? dependsOnHint || displayText(shell.please_select)
      : undefined;

  const notFoundContent = error
    ? error
    : loading
      ? displayText(shell.reference_loading_options)
      : criteriaEmptyHint?.trim() || emptyHint?.trim() || displayText(shell.please_select);

  const placeholder =
    dependsOnHint || emptyHint?.trim() || displayText(shell.reference_select_record);

  const createActionLabel = displayTextTemplate(shell.reference_create_action, {
    object: createObjectDisplayLabel,
  });

  const select = (
    <Select
      className="object-reference-select"
      style={{ width: "100%" }}
      value={current || undefined}
      disabled={disabled || blockedByCriteria || blockedByControllingField}
      allowClear={!required}
      showSearch
      optionFilterProp="label"
      loading={loading && !isPreset}
      placeholder={placeholder}
      aria-label={label}
      aria-required={required || undefined}
      options={options.map((o) => ({ value: o.recordId, label: o.label }))}
      notFoundContent={notFoundContent}
      onChange={(next) => onChange((next as string) ?? "")}
      popupRender={
        allowInlineCreate
          ? (menu) => (
              <>
                {menu}
                <button
                  type="button"
                  className="object-reference-select__create-action"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setCreateOpen(true)}
                >
                  {createActionLabel}
                </button>
              </>
            )
          : undefined
      }
    />
  );

  const errorHint = error ? (
    <span className="field__hint field__hint--error">{error}</span>
  ) : null;

  const createModal = allowInlineCreate ? (
    <InlineReferenceCreateModal
      open={createOpen}
      vaultId={vaultId}
      targetObject={targetObject}
      objectType={createObjectType}
      relationshipCriteria={criteria}
      sourceFieldValues={sourceValues}
      sourceFieldDisplays={displays}
      onCancel={() => setCreateOpen(false)}
      onCreated={({ recordId, label: createdLabel }) => {
        setCreatedOption({ recordId, label: formatReferenceLabel(recordId, createdLabel) });
        onChange(recordId);
        setCreateOpen(false);
      }}
    />
  ) : null;

  if (!showLabel) {
    return (
      <>
        {select}
        {errorHint}
        {createModal}
      </>
    );
  }

  const targetObjectHintLabel = displayTextTemplate(shell.reference_target_object, {
    object: targetObject,
  });

  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="field__required">*</span>}
      </span>
      <p className="field__hint">
        {targetObjectHintLabel.includes("{object}")
          ? `${displayText(shell.reference_target_object)} ${targetObject}`
          : targetObjectHintLabel}
      </p>
      {select}
      {errorHint}
      {createModal}
    </label>
  );
}
