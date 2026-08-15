import type { MenuProps } from "antd";
import type { LifecycleAction, SdkAction } from "../../api/types";
import { isDocumentToolbarAction } from "../../lib/documentActions";
import {
  defaultPageActionLabels,
  defaultRelatedChrome,
  displayText,
  type DisplayText,
} from "../../lib/i18n";
import { partitionLifecycleToolbarActions } from "./lifecycleToolbarActions";
import { recordActionIcon } from "./recordActionIcon";

function lifecycleMenuItems(
  actions: LifecycleAction[],
  lifecyclePending: boolean | undefined,
  onLifecycleAction: (action: LifecycleAction) => void,
): MenuProps["items"] {
  return actions.map((action) => ({
    key: action.name,
    label: displayText(action.label, action.name),
    icon: recordActionIcon(
      action.name,
      typeof action.label === "string" ? action.label : action.label?.text,
    ),
    disabled: lifecyclePending,
    onClick: () => onLifecycleAction(action),
  }));
}

export type RecordActionMenuOptions = {
  lifecycleActions?: LifecycleAction[];
  sdkActions?: SdkAction[];
  lifecyclePending?: boolean;
  onLifecycleAction: (action: LifecycleAction) => void;
  onSdkAction?: (action: SdkAction) => void;
  editAllowed?: boolean;
  onEdit?: () => void;
  deleteAllowed?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
  unlinkAllowed?: boolean;
  removing?: boolean;
  onUnlink?: () => void;
  unlinkLabel?: DisplayText;
  labels?: typeof defaultPageActionLabels;
};

/** SDK actions that belong in All Actions / row overflow (not the document toolbar). */
export function sdkActionsForOverflowMenu(sdkActions: SdkAction[] | undefined): SdkAction[] {
  return (sdkActions ?? []).filter((action) => !isDocumentToolbarAction(action.name));
}

export function buildRecordActionMenuItems({
  lifecycleActions = [],
  sdkActions = [],
  lifecyclePending,
  onLifecycleAction,
  onSdkAction,
  editAllowed,
  onEdit,
  deleteAllowed,
  deleting,
  onDelete,
  unlinkAllowed,
  removing,
  onUnlink,
  unlinkLabel,
  labels = defaultPageActionLabels,
}: RecordActionMenuOptions): MenuProps["items"] {
  const { startWorkflow, changeState, allActionsMenu } =
    partitionLifecycleToolbarActions(lifecycleActions);

  // Match record detail All Actions: document toolbar actions (checkout, download,
  // check-in, …) live on the document action bar, not in the overflow menu.
  const overflowSdkActions = sdkActionsForOverflowMenu(sdkActions);

  const manageItems: MenuProps["items"] = [
    ...lifecycleMenuItems(allActionsMenu, lifecyclePending, onLifecycleAction),
    ...overflowSdkActions.map((action) => ({
      key: `sdk-${action.name}`,
      label: displayText(action.label, action.name),
      icon: recordActionIcon(
        action.name,
        typeof action.label === "string" ? action.label : action.label?.text,
      ),
      disabled: lifecyclePending || !onSdkAction,
      onClick: () => onSdkAction?.(action),
    })),
  ].filter(Boolean);

  const editItems: MenuProps["items"] = [];
  if (editAllowed && onEdit) {
    editItems.push({
      key: "edit-record",
      label: displayText(labels.edit),
      icon: recordActionIcon("edit", undefined, "edit"),
      onClick: onEdit,
    });
  }
  if (deleteAllowed && onDelete) {
    editItems.push({
      key: "delete-record",
      label: deleting ? displayText(labels.deleting) : displayText(labels.delete),
      icon: recordActionIcon("delete", undefined, "delete"),
      danger: true,
      disabled: deleting,
      onClick: onDelete,
    });
  }
  if (unlinkAllowed && onUnlink) {
    editItems.push({
      key: "unlink",
      label: displayText(unlinkLabel ?? defaultRelatedChrome.remove_relationship),
      icon: recordActionIcon("unlink", undefined, "unlink"),
      danger: true,
      disabled: removing,
      onClick: onUnlink,
    });
  }

  return [
    startWorkflow.length > 0
      ? {
          key: "start-workflow-heading",
          type: "group" as const,
          label: displayText(labels.menu_group_start_workflow),
          children: lifecycleMenuItems(startWorkflow, lifecyclePending, onLifecycleAction),
        }
      : null,
    changeState.length > 0
      ? {
          key: "change-state-heading",
          type: "group" as const,
          label: displayText(labels.menu_group_change_state),
          children: lifecycleMenuItems(changeState, lifecyclePending, onLifecycleAction),
        }
      : null,
    manageItems.length > 0
      ? {
          key: "manage-heading",
          type: "group" as const,
          label: displayText(labels.menu_group_manage),
          children: manageItems,
        }
      : null,
    editItems.length > 0
      ? {
          key: "edit-heading",
          type: "group" as const,
          label: displayText(labels.menu_group_edit),
          children: editItems,
        }
      : null,
  ].filter(Boolean) as MenuProps["items"];
}
