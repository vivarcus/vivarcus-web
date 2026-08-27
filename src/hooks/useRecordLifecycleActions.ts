import { message } from "antd";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type {
  LifecycleAction,
  PreExecutionDialogModel,
  RecordPageModel,
  SdkAction,
} from "../api/types";
import { useUi } from "../context/UiContext";
import { resolveActionErrorMessage } from "../lib/lifecycleActionError";
import { displayText } from "../lib/i18n";
import { handleStaleError } from "../lib/staleGuard";
import {
  isDocumentDownloadAction,
  isDocumentCreateDraftAction,
  isDocumentUploadAction,
  triggerBrowserDownload,
} from "../lib/documentActions";
import { isPromotePersonToUserDialog, buildPromotePersonToUserHref } from "../lib/promotePersonForm";
import {
  buildMilestoneWorkspaceHref,
  isViewExpectedDocumentsAction,
} from "../lib/milestoneWorkspace";
import {
  buildEdlCreateDocumentHref,
  isEdlCreateDocumentAction,
} from "../lib/edlCreateDocument";
import {
  buildReviewDeployHref,
  isCfgExportAction,
  isCfgReviewDeployAction,
  isCfgValidateAction,
  outboundExportMeta,
} from "../lib/cfgPackagingActions";
import { pushNavTrail } from "../lib/navTrail";

export type RecordLifecycleTarget = {
  objectName: string;
  recordId: string;
  page: RecordPageModel;
};

export type PreExecutionActionKind = "lifecycle" | "sdk";

export type DocumentUploadRequest = {
  action: SdkAction;
  target: RecordLifecycleTarget;
};

export type UseRecordLifecycleActionsOptions = {
  vaultId: string | undefined;
  actionFailedLabel: string;
  onReload: () => Promise<void>;
  setError: (message: string | null) => void;
  /** Record detail: fixed page context for toolbar lifecycle actions. */
  getFixedTarget?: () => RecordLifecycleTarget | null;
  onPageUpdated?: (page: RecordPageModel) => void;
  onAfterSuccess?: () => void | Promise<void>;
  /** Opens Change Type preview form (Change Issue Type lifecycle/SDK actions). */
  onChangeTypePreview?: (
    target: RecordLifecycleTarget,
    objectTypeName: string,
  ) => void | Promise<void>;
};

const changeIssueTypeInputKey = "changeIssueObjTypePicklist";

function isChangeIssueTypeDialog(dialog: PreExecutionDialogModel): boolean {
  if (dialog.inputs?.some((input) => input.key === changeIssueTypeInputKey)) {
    return true;
  }
  return Boolean(dialog.resolved_inputs?.[changeIssueTypeInputKey]?.trim());
}

function resolveChangeIssueTargetType(
  dialog: PreExecutionDialogModel,
  inputs: Record<string, string>,
): string | undefined {
  const fromInputs = inputs[changeIssueTypeInputKey]?.trim();
  if (fromInputs) {
    return fromInputs;
  }
  const fromResolved = dialog.resolved_inputs?.[changeIssueTypeInputKey]?.trim();
  if (fromResolved) {
    return fromResolved;
  }
  return undefined;
}

function fieldValueFromPage(page: RecordPageModel, fieldAPIName: string): unknown {
  for (const section of page.sections) {
    for (const element of section.elements) {
      if (element.field_api_name === fieldAPIName) {
        return element.value;
      }
    }
  }
  return undefined;
}

function resolveLifecycleActionOnPage(
  page: RecordPageModel,
  actionName: string,
  fallback: LifecycleAction,
): LifecycleAction {
  const enriched = page.lifecycle_actions?.find((action) => action.name === actionName);
  return enriched ?? fallback;
}

function hasWorkflowDialog(action: LifecycleAction): boolean {
  return (action.workflow_start_dialog?.controls?.length ?? 0) > 0;
}

function initialPreExecutionValues(dialog: PreExecutionDialogModel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const input of dialog.inputs ?? []) {
    const fallback = input.possible_values?.[0]?.key ?? "";
    if (input.key && fallback) {
      out[input.key] = fallback;
    }
  }
  return out;
}

function preExecutionDialogRequiresConfirmation(dialog: PreExecutionDialogModel): boolean {
  if (dialog.user_input_record_information) {
    return true;
  }
  if ((dialog.message ?? "").trim()) {
    return true;
  }
  return (dialog.inputs?.length ?? 0) > 0;
}

export function useRecordLifecycleActions({
  vaultId,
  actionFailedLabel,
  onReload,
  setError,
  getFixedTarget,
  onPageUpdated,
  onAfterSuccess,
  onChangeTypePreview,
}: UseRecordLifecycleActionsOptions) {
  const { shell } = useUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [rowLifecycleFetchingId, setRowLifecycleFetchingId] = useState<string | null>(null);
  const [documentUploadRequest, setDocumentUploadRequest] = useState<DocumentUploadRequest | null>(
    null,
  );
  const [workflowDialogAction, setWorkflowDialogAction] = useState<LifecycleAction | null>(null);
  const [preExecutionLifecycleAction, setPreExecutionLifecycleAction] = useState<LifecycleAction | null>(null);
  const [preExecutionSdkAction, setPreExecutionSdkAction] = useState<SdkAction | null>(null);
  const [preExecutionActionKind, setPreExecutionActionKind] = useState<PreExecutionActionKind | null>(null);
  const [preExecutionDialog, setPreExecutionDialog] = useState<PreExecutionDialogModel | null>(null);
  const [dialogTarget, setDialogTarget] = useState<RecordLifecycleTarget | null>(null);
  const [workflowFieldValues, setWorkflowFieldValues] = useState<Record<string, unknown>>({});
  const [workflowParticipantValues, setWorkflowParticipantValues] = useState<Record<string, string[]>>({});
  const [workflowDateValues, setWorkflowDateValues] = useState<Record<string, string>>({});
  const [workflowAssignmentTypeValues, setWorkflowAssignmentTypeValues] = useState<
    Record<string, string>
  >({});
  const [preExecutionInputValues, setPreExecutionInputValues] = useState<Record<string, string>>({});
  const [envelopeRecordIds, setEnvelopeRecordIds] = useState<string[] | null>(null);

  /**
   * Trail hop for an action that navigates away. Only the page's own record can
   * label the current location; for row actions the destination falls back to
   * the acted-on record, which each href builder supplies itself.
   */
  const navTrailForTarget = useCallback(
    (target: RecordLifecycleTarget): string => {
      const fixed = getFixedTarget?.();
      if (!fixed || fixed.recordId !== target.recordId) {
        return "";
      }
      const label = target.page.record_name?.trim();
      if (!label) {
        return "";
      }
      return pushNavTrail(location.search, { pathname: location.pathname, label });
    },
    [getFixedTarget, location.pathname, location.search],
  );

  const clearPreExecutionState = useCallback(() => {
    setPreExecutionLifecycleAction(null);
    setPreExecutionSdkAction(null);
    setPreExecutionActionKind(null);
    setPreExecutionDialog(null);
    setPreExecutionInputValues({});
  }, []);

  const runLifecycleAction = useCallback(
    async (
      action: LifecycleAction,
      target: RecordLifecycleTarget,
      options?: {
        workflowFields?: Record<string, unknown>;
        workflowParticipants?: Record<string, string[]>;
        workflowDates?: Record<string, string>;
        workflowAssignmentTypes?: Record<string, string>;
        preExecutionInputs?: Record<string, string>;
        userInputFields?: Record<string, unknown>;
        recordIds?: string[];
      },
    ) => {
      if (!vaultId || lifecyclePending) {
        return;
      }
      setLifecyclePending(true);
      setError(null);
      try {
        const res = await api.lifecycleTransition(vaultId, target.objectName, target.recordId, {
          action: action.name,
          action_guard: {
            schema_fingerprint: target.page.schema_fingerprint,
            ui_fingerprint: target.page.ui_fingerprint,
            record_version: target.page.record_version,
          },
          layout: target.page.selected_layout.api_name,
          workflow_fields: options?.workflowFields,
          workflow_participants: options?.workflowParticipants,
          workflow_dates: options?.workflowDates,
          workflow_assignment_types: options?.workflowAssignmentTypes,
          pre_execution_inputs: options?.preExecutionInputs,
          user_input_fields: options?.userInputFields,
          record_ids: options?.recordIds,
        });
        onPageUpdated?.(res.page);
        message.success(displayText(action.label, action.name));
        await onAfterSuccess?.();
      } catch (err) {
        const messageText = resolveActionErrorMessage(err, actionFailedLabel, shell);
        await handleStaleError(err, onReload, setError, messageText, shell);
      } finally {
        setLifecyclePending(false);
        setRowLifecycleFetchingId(null);
        setWorkflowDialogAction(null);
        setDialogTarget(null);
        setEnvelopeRecordIds(null);
        clearPreExecutionState();
      }
    },
    [
      vaultId,
      lifecyclePending,
      setError,
      actionFailedLabel,
      shell,
      onReload,
      onPageUpdated,
      onAfterSuccess,
      clearPreExecutionState,
    ],
  );

  const runDocumentDownload = useCallback(
    async (action: SdkAction, target: RecordLifecycleTarget) => {
      if (!vaultId || lifecyclePending) {
        return;
      }
      setLifecyclePending(true);
      setError(null);
      try {
        const blob =
          action.name === "download_rendition__v"
            ? await api.downloadDocumentRendition(vaultId, target.objectName, target.recordId)
            : await api.downloadDocumentSource(vaultId, target.objectName, target.recordId);
        const fallbackName =
          action.name === "download_rendition__v" ? "document.pdf" : "document-source";
        triggerBrowserDownload(blob, fallbackName);
        message.success(displayText(action.label, action.name));
        await onAfterSuccess?.();
      } catch (err) {
        const messageText = resolveActionErrorMessage(err, actionFailedLabel, shell);
        await handleStaleError(err, onReload, setError, messageText, shell);
      } finally {
        setLifecyclePending(false);
      }
    },
    [
      vaultId,
      lifecyclePending,
      setError,
      actionFailedLabel,
      shell,
      onReload,
      onAfterSuccess,
    ],
  );

  const runSdkAction = useCallback(
    async (
      action: SdkAction,
      target: RecordLifecycleTarget,
      options?: { preExecutionInputs?: Record<string, string> },
    ) => {
      if (!vaultId || lifecyclePending) {
        return;
      }
      setLifecyclePending(true);
      setError(null);
      try {
        const res = await api.sdkAction(vaultId, target.objectName, target.recordId, {
          action: action.name,
          action_guard: {
            schema_fingerprint: target.page.schema_fingerprint,
            ui_fingerprint: target.page.ui_fingerprint,
            record_version: target.page.record_version,
          },
          layout: target.page.selected_layout.api_name,
          pre_execution_inputs: options?.preExecutionInputs,
        });
        onPageUpdated?.(res.page);
        message.success(displayText(action.label, action.name));
        await onAfterSuccess?.();
      } catch (err) {
        const messageText = resolveActionErrorMessage(err, actionFailedLabel, shell);
        await handleStaleError(err, onReload, setError, messageText, shell);
      } finally {
        setLifecyclePending(false);
        clearPreExecutionState();
        setDialogTarget(null);
      }
    },
    [
      vaultId,
      lifecyclePending,
      setError,
      actionFailedLabel,
      shell,
      onReload,
      onPageUpdated,
      onAfterSuccess,
      clearPreExecutionState,
    ],
  );

  const openWorkflowDialog = useCallback((action: LifecycleAction, target: RecordLifecycleTarget) => {
    const initial: Record<string, unknown> = {};
    const initialParticipants: Record<string, string[]> = {};
    const initialDates: Record<string, string> = {};
    for (const control of action.workflow_start_dialog?.controls ?? []) {
      if (control.type === "field" && control.field_api_name) {
        initial[control.field_api_name] = fieldValueFromPage(target.page, control.field_api_name);
      }
      if (control.type === "participant" && control.participant_name) {
        initialParticipants[control.participant_name] = control.default_user_ids?.length
          ? [...control.default_user_ids]
          : [];
      }
      if (control.type === "date" && control.control_name) {
        initialDates[control.control_name] = "";
      }
    }
    setWorkflowFieldValues(initial);
    setWorkflowParticipantValues(initialParticipants);
    setWorkflowDateValues(initialDates);
    setWorkflowAssignmentTypeValues({});
    clearPreExecutionState();
    setDialogTarget(target);
    setWorkflowDialogAction(action);
  }, [clearPreExecutionState]);

  const openPreExecutionDialog = useCallback(
    (
      kind: PreExecutionActionKind,
      target: RecordLifecycleTarget,
      dialog: PreExecutionDialogModel,
      lifecycleAction?: LifecycleAction,
      sdkAction?: SdkAction,
    ) => {
      setWorkflowDialogAction(null);
      setWorkflowFieldValues({});
      setWorkflowParticipantValues({});
      setWorkflowDateValues({});
      setWorkflowAssignmentTypeValues({});
      setPreExecutionInputValues(initialPreExecutionValues(dialog));
      setDialogTarget(target);
      setPreExecutionDialog(dialog);
      setPreExecutionActionKind(kind);
      setPreExecutionLifecycleAction(lifecycleAction ?? null);
      setPreExecutionSdkAction(sdkAction ?? null);
    },
    [],
  );

  const runChangeIssueTypePreview = useCallback(
    async (
      target: RecordLifecycleTarget,
      dialog: PreExecutionDialogModel,
      inputs: Record<string, string>,
    ) => {
      if (!onChangeTypePreview) {
        return false;
      }
      if (!isChangeIssueTypeDialog(dialog)) {
        return false;
      }
      const objectTypeName = resolveChangeIssueTargetType(dialog, inputs);
      if (!objectTypeName) {
        return false;
      }
      setLifecyclePending(false);
      setRowLifecycleFetchingId(null);
      setDialogTarget(null);
      clearPreExecutionState();
      await onChangeTypePreview(target, objectTypeName);
      return true;
    },
    [onChangeTypePreview, clearPreExecutionState],
  );

  const beginPreExecution = useCallback(
    async (
      kind: PreExecutionActionKind,
      target: RecordLifecycleTarget,
      actionName: string,
      lifecycleAction?: LifecycleAction,
      sdkAction?: SdkAction,
      runDirect?: () => Promise<void>,
    ) => {
      if (!vaultId || lifecyclePending) {
        return;
      }
      setLifecyclePending(true);
      setError(null);
      try {
        const dialog = await api.recordActionPreExecutionDialog(
          vaultId,
          target.objectName,
          target.recordId,
          actionName,
          kind,
        );
        const resolvedIssueType = dialog.resolved_inputs?.[changeIssueTypeInputKey]?.trim();
        if (resolvedIssueType && isChangeIssueTypeDialog(dialog)) {
          if (await runChangeIssueTypePreview(target, dialog, dialog.resolved_inputs ?? {})) {
            return;
          }
        }
        if (preExecutionDialogRequiresConfirmation(dialog)) {
          if (
            kind === "lifecycle" &&
            lifecycleAction &&
            isPromotePersonToUserDialog(dialog.user_input_record_information?.object_api_name)
          ) {
            setLifecyclePending(false);
            const tab = new URLSearchParams(location.search).get("tab") ?? undefined;
            navigate(
              buildPromotePersonToUserHref(target.recordId, lifecycleAction.name, {
                navTrail: navTrailForTarget(target),
                tab,
              }),
            );
            return;
          }
          setLifecyclePending(false);
          openPreExecutionDialog(kind, target, dialog, lifecycleAction, sdkAction);
          return;
        }
        setLifecyclePending(false);
        if (runDirect) {
          await runDirect();
        }
      } catch (err) {
        setLifecyclePending(false);
        setRowLifecycleFetchingId(null);
        setError(err instanceof Error ? err.message : actionFailedLabel);
      }
    },
    [vaultId, lifecyclePending, setError, actionFailedLabel, openPreExecutionDialog, runChangeIssueTypePreview, navigate, location, navTrailForTarget],
  );

  const beginLifecycleAction = useCallback(
    async (
      action: LifecycleAction,
      target: RecordLifecycleTarget,
      options?: { recordIds?: string[] },
    ) => {
      if (options?.recordIds && options.recordIds.length > 0) {
        setEnvelopeRecordIds(options.recordIds);
      } else {
        setEnvelopeRecordIds(null);
      }
      if (
        action.kind === "application_action" &&
        isViewExpectedDocumentsAction(action.name) &&
        target.objectName === "milestone__v"
      ) {
        navigate(
          buildMilestoneWorkspaceHref(target.recordId, {
            navTrail: navTrailForTarget(target),
          }),
        );
        return;
      }
      if (hasWorkflowDialog(action)) {
        openWorkflowDialog(action, target);
        return;
      }
      const recordIds = options?.recordIds;
      await beginPreExecution("lifecycle", target, action.name, action, undefined, () =>
        runLifecycleAction(action, target, { recordIds }),
      );
    },
    [openWorkflowDialog, beginPreExecution, runLifecycleAction, navigate, navTrailForTarget],
  );

  const handleLifecycleAction = useCallback(
    (action: LifecycleAction, target?: RecordLifecycleTarget) => {
      const resolved = target ?? getFixedTarget?.();
      if (!resolved) {
        return;
      }
      void beginLifecycleAction(action, resolved);
    },
    [getFixedTarget, beginLifecycleAction],
  );

  const handleSdkAction = useCallback(
    (action: SdkAction, target?: RecordLifecycleTarget) => {
      const resolved = target ?? getFixedTarget?.();
      if (!resolved) {
        return;
      }
      if (isEdlCreateDocumentAction(action.name, resolved.objectName)) {
        navigate(
          buildEdlCreateDocumentHref(resolved.recordId, resolved.page, {
            navTrail: navTrailForTarget(resolved),
          }),
        );
        return;
      }
      if (isCfgReviewDeployAction(action.name, resolved.objectName)) {
        navigate(buildReviewDeployHref(resolved.recordId));
        return;
      }
      if (isCfgExportAction(action.name, resolved.objectName)) {
        void (async () => {
          if (!vaultId || lifecyclePending) return;
          setLifecyclePending(true);
          setError(null);
          try {
            const meta = outboundExportMeta(resolved.page);
            await api.exportOutboundPackageFromRecord(vaultId, resolved.recordId, meta);
            message.info(
              "Export started. You will receive a notification when processing is complete.",
            );
            await onAfterSuccess?.();
            await onReload?.();
          } catch (err) {
            const messageText = resolveActionErrorMessage(err, actionFailedLabel, shell);
            await handleStaleError(err, onReload, setError, messageText, shell);
          } finally {
            setLifecyclePending(false);
          }
        })();
        return;
      }
      if (isCfgValidateAction(action.name, resolved.objectName)) {
        void (async () => {
          if (!vaultId || lifecyclePending) return;
          setLifecyclePending(true);
          setError(null);
          try {
            const detail = await api.validateInboundPackageFromRecord(vaultId, resolved.recordId);
            message.success(`Validation status: ${detail.deployment_status}`);
            await onAfterSuccess?.();
            await onReload?.();
          } catch (err) {
            const messageText = resolveActionErrorMessage(err, actionFailedLabel, shell);
            await handleStaleError(err, onReload, setError, messageText, shell);
          } finally {
            setLifecyclePending(false);
          }
        })();
        return;
      }
      if (isDocumentDownloadAction(action.name)) {
        void runDocumentDownload(action, resolved);
        return;
      }
      if (isDocumentUploadAction(action.name) || isDocumentCreateDraftAction(action.name)) {
        setDocumentUploadRequest({ action, target: resolved });
        return;
      }
      void beginPreExecution("sdk", resolved, action.name, undefined, action, () =>
        runSdkAction(action, resolved),
      );
    },
    [
      getFixedTarget,
      beginPreExecution,
      runSdkAction,
      runDocumentDownload,
      navigate,
      navTrailForTarget,
      vaultId,
      lifecyclePending,
      setError,
      actionFailedLabel,
      shell,
      onAfterSuccess,
      onReload,
    ],
  );

  const clearDocumentUploadRequest = useCallback(() => {
    setDocumentUploadRequest(null);
  }, []);

  const completeDocumentUpload = useCallback(
    async (action: SdkAction, target: RecordLifecycleTarget) => {
      if (action.name === "checkin__v") {
        if (!vaultId) {
          return;
        }
        const freshPage = await api.recordPage(vaultId, target.objectName, target.recordId);
        onPageUpdated?.(freshPage);
        await runSdkAction(action, { ...target, page: freshPage });
        return;
      }
      if (action.name === "upload_new_version__v" || action.name === "create_draft__v") {
        await onReload?.();
        message.success(displayText(action.label, action.name));
      }
    },
    [vaultId, runSdkAction, onReload, onPageUpdated],
  );

  const handleRowLifecycleAction = useCallback(
    async (
      objectName: string,
      recordId: string,
      action: LifecycleAction,
      extras?: { recordIds?: string[] },
    ) => {
      if (!vaultId || lifecyclePending || rowLifecycleFetchingId) {
        return;
      }
      setRowLifecycleFetchingId(recordId);
      setError(null);
      try {
        const page = await api.recordPage(vaultId, objectName, recordId);
        const resolvedAction = resolveLifecycleActionOnPage(page, action.name, action);
        const target = { objectName, recordId, page };
        setRowLifecycleFetchingId(null);
        await beginLifecycleAction(resolvedAction, target, {
          recordIds: extras?.recordIds,
        });
      } catch (err) {
        setEnvelopeRecordIds(null);
        setRowLifecycleFetchingId(null);
        setError(err instanceof Error ? err.message : actionFailedLabel);
      }
    },
    [
      vaultId,
      lifecyclePending,
      rowLifecycleFetchingId,
      setError,
      actionFailedLabel,
      beginLifecycleAction,
    ],
  );

  const handleRowSdkAction = useCallback(
    async (objectName: string, recordId: string, action: SdkAction) => {
      if (!vaultId || lifecyclePending || rowLifecycleFetchingId) {
        return;
      }
      // Same as lifecycle rows: load the record page so document upload / create-draft
      // dialogs and action_guard fingerprints match the detail-page path.
      setRowLifecycleFetchingId(recordId);
      setError(null);
      try {
        const page = await api.recordPage(vaultId, objectName, recordId);
        setRowLifecycleFetchingId(null);
        handleSdkAction(action, { objectName, recordId, page });
      } catch (err) {
        setRowLifecycleFetchingId(null);
        setError(err instanceof Error ? err.message : actionFailedLabel);
      }
    },
    [
      vaultId,
      lifecyclePending,
      rowLifecycleFetchingId,
      setError,
      actionFailedLabel,
      handleSdkAction,
    ],
  );

  const confirmWorkflowDialog = useCallback(async () => {
    if (!workflowDialogAction || !dialogTarget) {
      return;
    }
    const action = workflowDialogAction;
    const target = dialogTarget;
    const fields = { ...workflowFieldValues };
    const participants = { ...workflowParticipantValues };
    const dates = { ...workflowDateValues };
    const assignmentTypes = { ...workflowAssignmentTypeValues };
    const fieldControls =
      action.workflow_start_dialog?.controls?.filter(
        (control) => control.type === "field" && control.field_api_name,
      ) ?? [];
    const participantControls =
      action.workflow_start_dialog?.controls?.filter(
        (control) => control.type === "participant" && control.participant_name,
      ) ?? [];
    const dateControls =
      action.workflow_start_dialog?.controls?.filter(
        (control) => control.type === "date" && control.control_name,
      ) ?? [];
    const hasRuntimeChoice = participantControls.some((control) => control.runtime_choice);
    await runLifecycleAction(action, target, {
      workflowFields: fieldControls.length > 0 ? fields : undefined,
      workflowParticipants: participantControls.length > 0 ? participants : undefined,
      workflowDates: dateControls.length > 0 ? dates : undefined,
      workflowAssignmentTypes: hasRuntimeChoice ? assignmentTypes : undefined,
      recordIds: envelopeRecordIds ?? undefined,
    });
  }, [
    workflowDialogAction,
    dialogTarget,
    workflowFieldValues,
    workflowParticipantValues,
    workflowDateValues,
    workflowAssignmentTypeValues,
    envelopeRecordIds,
    runLifecycleAction,
  ]);

  const confirmPreExecutionDialog = useCallback(async () => {
    if (!dialogTarget || !preExecutionActionKind || !preExecutionDialog) {
      return;
    }
    const target = dialogTarget;
    if (preExecutionActionKind === "sdk") {
      if (!preExecutionSdkAction) {
        return;
      }
      if (preExecutionDialog.user_input_record_information) {
        setError("User input object dialogs are not supported yet.");
        return;
      }
      const action = preExecutionSdkAction;
      const inputs = { ...preExecutionInputValues };
      if (await runChangeIssueTypePreview(target, preExecutionDialog, inputs)) {
        return;
      }
      await runSdkAction(action, target, { preExecutionInputs: inputs });
      return;
    }
    if (!preExecutionLifecycleAction) {
      return;
    }
    const action = preExecutionLifecycleAction;
    const inputs = { ...preExecutionInputValues };
    if (await runChangeIssueTypePreview(target, preExecutionDialog, inputs)) {
      return;
    }
    await runLifecycleAction(action, target, {
      preExecutionInputs: inputs,
      recordIds: envelopeRecordIds ?? undefined,
    });
  }, [
    dialogTarget,
    preExecutionActionKind,
    preExecutionDialog,
    preExecutionSdkAction,
    preExecutionLifecycleAction,
    preExecutionInputValues,
    envelopeRecordIds,
    runSdkAction,
    runLifecycleAction,
    runChangeIssueTypePreview,
    setError,
  ]);

  const cancelActionDialog = useCallback(() => {
    setWorkflowDialogAction(null);
    clearPreExecutionState();
    setDialogTarget(null);
    setRowLifecycleFetchingId(null);
    setEnvelopeRecordIds(null);
  }, [clearPreExecutionState]);

  const isRowLifecycleBusy = useCallback(
    (recordId: string) =>
      rowLifecycleFetchingId === recordId ||
      (dialogTarget?.recordId === recordId &&
        (lifecyclePending ||
          workflowDialogAction != null ||
          preExecutionActionKind != null)),
    [
      rowLifecycleFetchingId,
      lifecyclePending,
      dialogTarget,
      workflowDialogAction,
      preExecutionActionKind,
    ],
  );

  const preExecutionActionLabel =
    preExecutionActionKind === "sdk" && preExecutionSdkAction
      ? preExecutionSdkAction.label
      : preExecutionLifecycleAction?.label;
  const preExecutionActionName =
    preExecutionActionKind === "sdk"
      ? preExecutionSdkAction?.name
      : preExecutionLifecycleAction?.name;

  return {
    lifecyclePending,
    rowLifecycleFetchingId,
    workflowDialogAction,
    preExecutionLifecycleAction,
    preExecutionSdkAction,
    preExecutionActionKind,
    preExecutionDialog,
    preExecutionActionLabel,
    preExecutionActionName,
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
    handleRowLifecycleAction,
    handleRowSdkAction,
    documentUploadRequest,
    clearDocumentUploadRequest,
    completeDocumentUpload,
    confirmWorkflowDialog,
    confirmPreExecutionDialog,
    cancelActionDialog,
    isRowLifecycleBusy,
  };
}
