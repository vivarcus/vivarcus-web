import { useCallback, useState } from "react";
import { api } from "../../api/client";
import type { LifecycleAction, RelatedRowActions, SdkAction } from "../../api/types";
import { RecordRowActionMenu, rowHasRecordActions } from "./RecordRowActionMenu";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  enabled?: boolean;
  staticActions?: RelatedRowActions;
  fetchOnOpen?: boolean;
  fetchActions?: () => Promise<RelatedRowActions | undefined>;
  removing?: boolean;
  deletingRecord?: boolean;
  lifecyclePending?: boolean;
  onRemove?: () => void;
  onEditRecord?: (actions: RelatedRowActions) => void;
  onDeleteRecord?: (actions: RelatedRowActions) => void;
  onLifecycleAction: (action: LifecycleAction, actions: RelatedRowActions) => void;
  onSdkAction?: (action: SdkAction, actions: RelatedRowActions) => void;
  unlinkLabel?: import("../../lib/i18n").DisplayText;
  actionsAria?: import("../../lib/i18n").DisplayText;
};

function mergeActions(
  loaded: RelatedRowActions | undefined,
  staticActions?: RelatedRowActions,
): RelatedRowActions | undefined {
  if (!loaded && !staticActions) {
    return undefined;
  }
  return {
    ...staticActions,
    ...loaded,
    unlink_allowed: staticActions?.unlink_allowed ?? loaded?.unlink_allowed,
    lifecycle_actions: loaded?.lifecycle_actions ?? staticActions?.lifecycle_actions,
    sdk_actions: loaded?.sdk_actions ?? staticActions?.sdk_actions,
    edit_record_allowed: loaded?.edit_record_allowed ?? staticActions?.edit_record_allowed,
    delete_record_allowed: loaded?.delete_record_allowed ?? staticActions?.delete_record_allowed,
    action_guard: loaded?.action_guard ?? staticActions?.action_guard,
    target_object_api_name:
      loaded?.target_object_api_name ??
      staticActions?.target_object_api_name,
    target_record_id: loaded?.target_record_id ?? staticActions?.target_record_id,
  };
}

export function LazyRecordRowActionMenu({
  vaultId,
  objectName,
  recordId,
  enabled = true,
  staticActions,
  fetchOnOpen = true,
  fetchActions,
  removing,
  deletingRecord,
  lifecyclePending,
  onRemove,
  onEditRecord,
  onDeleteRecord,
  onLifecycleAction,
  onSdkAction,
  unlinkLabel,
  actionsAria,
}: Props) {
  const [loadedActions, setLoadedActions] = useState<RelatedRowActions | undefined>();
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);

  const resolvedActions = mergeActions(loadedActions, staticActions);
  const hasMenu = Boolean(resolvedActions && rowHasRecordActions(resolvedActions));

  const loadActions = useCallback(async () => {
    if (fetched) {
      return mergeActions(loadedActions, staticActions);
    }
    if (!fetchOnOpen) {
      const merged = mergeActions(undefined, staticActions);
      setFetched(true);
      return merged;
    }
    setFetching(true);
    try {
      const actions = fetchActions
        ? await fetchActions()
        : (await api.recordRowActions(vaultId, objectName, recordId)).actions;
      const merged = mergeActions(actions, staticActions);
      setLoadedActions(actions);
      setFetched(true);
      return merged;
    } catch {
      // Mark fetched so a failed load does not leave the menu stuck on "Loading…".
      setFetched(true);
      return undefined;
    } finally {
      setFetching(false);
    }
  }, [
    fetched,
    fetchActions,
    fetchOnOpen,
    loadedActions,
    objectName,
    recordId,
    staticActions,
    vaultId,
  ]);

  async function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setOpen(false);
      return;
    }
    // Click-to-load: always fetch before deciding, even when staticActions
    // already has unlink. Skipping fetch here left menus stuck on unlink-only.
    if (fetchOnOpen && !fetched) {
      setOpen(true);
      try {
        const merged = await loadActions();
        if (!merged || !rowHasRecordActions(merged)) {
          setOpen(false);
        }
      } catch {
        setOpen(false);
      }
      return;
    }
    if (resolvedActions && rowHasRecordActions(resolvedActions)) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }

  if (!enabled) {
    return null;
  }

  return (
    <RecordRowActionMenu
      actions={resolvedActions}
      removing={removing}
      deletingRecord={deletingRecord}
      lifecyclePending={lifecyclePending}
      onRemove={onRemove}
      onEditRecord={
        onEditRecord && resolvedActions
          ? () => onEditRecord(resolvedActions)
          : undefined
      }
      onDeleteRecord={
        onDeleteRecord && resolvedActions
          ? () => onDeleteRecord(resolvedActions)
          : undefined
      }
      onLifecycleAction={(action) => {
        if (resolvedActions) {
          onLifecycleAction(action, resolvedActions);
        }
      }}
      onSdkAction={
        onSdkAction && resolvedActions
          ? (action) => onSdkAction(action, resolvedActions)
          : undefined
      }
      unlinkLabel={unlinkLabel}
      actionsAria={actionsAria}
      open={open}
      onOpenChange={handleOpenChange}
      triggerLoading={fetching}
      showTriggerWhileEmpty={!hasMenu}
    />
  );
}
