import { EllipsisOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { LifecycleAction, RelatedRowActions, SdkAction } from "../../api/types";
import { defaultListChrome, displayText } from "../../lib/i18n";
import {
  buildRecordActionMenuItems,
  sdkActionsForOverflowMenu,
} from "./recordActionMenuItems";

type Props = {
  actions?: RelatedRowActions;
  removing?: boolean;
  deletingRecord?: boolean;
  lifecyclePending?: boolean;
  onRemove?: () => void;
  onEditRecord?: () => void;
  onDeleteRecord?: () => void;
  onLifecycleAction: (action: LifecycleAction) => void;
  onSdkAction?: (action: SdkAction) => void;
  unlinkLabel?: import("../../lib/i18n").DisplayText;
  actionsAria?: import("../../lib/i18n").DisplayText;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLoading?: boolean;
  showTriggerWhileEmpty?: boolean;
};

export function RecordRowActionMenu({
  actions,
  removing,
  deletingRecord,
  lifecyclePending,
  onRemove,
  onEditRecord,
  onDeleteRecord,
  onLifecycleAction,
  onSdkAction,
  unlinkLabel,
  actionsAria = defaultListChrome.list_actions_aria,
  open,
  onOpenChange,
  triggerLoading,
  showTriggerWhileEmpty,
}: Props) {
  const menuItems = buildRecordActionMenuItems({
    lifecycleActions: actions?.lifecycle_actions,
    sdkActions: actions?.sdk_actions,
    lifecyclePending,
    onLifecycleAction,
    onSdkAction,
    editAllowed: actions?.edit_record_allowed,
    onEdit: onEditRecord,
    deleteAllowed: actions?.delete_record_allowed,
    deleting: deletingRecord,
    onDelete: onDeleteRecord,
    unlinkAllowed: actions?.unlink_allowed,
    removing,
    onUnlink: onRemove,
    unlinkLabel,
  });
  const displayMenuItems =
    triggerLoading && menuItems.length === 0
      ? [{ key: "__loading", label: displayText(defaultListChrome.loading_list), disabled: true }]
      : menuItems;
  if (displayMenuItems.length === 0 && !showTriggerWhileEmpty) {
    return null;
  }
  const pending = removing || deletingRecord || lifecyclePending || triggerLoading;
  return (
    <div className="related-section__row-actions">
      <Dropdown
        menu={{ items: displayMenuItems }}
        trigger={["click"]}
        placement="bottomLeft"
        getPopupContainer={() => document.body}
        open={open}
        onOpenChange={onOpenChange}
      >
        <Button
          type="text"
          size="small"
          className="related-section__row-menu-trigger"
          icon={<EllipsisOutlined />}
          aria-label={displayText(actionsAria)}
          title={displayText(actionsAria)}
          loading={pending}
        />
      </Dropdown>
    </div>
  );
}

export function rowHasRecordActions(actions?: RelatedRowActions): boolean {
  if (!actions) {
    return false;
  }
  return (
    actions.unlink_allowed ||
    actions.edit_record_allowed ||
    actions.delete_record_allowed ||
    (actions.lifecycle_actions?.length ?? 0) > 0 ||
    sdkActionsForOverflowMenu(actions.sdk_actions).length > 0
  );
}
