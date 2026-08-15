import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined, DownOutlined, EditOutlined, ShareAltOutlined } from "@ant-design/icons";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";

export type SavedViewAction =
  | "save"
  | "save_as"
  | "rename"
  | "remove_from_sidebar"
  | "share"
  | "delete";

type Props = {
  chrome: ListChrome;
  disabled?: boolean;
  canSave?: boolean;
  canSaveAs?: boolean;
  canRename?: boolean;
  canRemoveFromSidebar?: boolean;
  canShare?: boolean;
  canDelete?: boolean;
  onAction: (action: SavedViewAction) => void;
};

export function SavedViewActionsMenu({
  chrome,
  disabled = false,
  canSave = false,
  canSaveAs = false,
  canRename = false,
  canRemoveFromSidebar = false,
  canShare = false,
  canDelete = false,
  onAction,
}: Props) {
  if (!canSave && !canSaveAs && !canRename && !canRemoveFromSidebar && !canShare && !canDelete) {
    return null;
  }

  const dropdownItems: MenuProps["items"] = [];
  if (canSave) {
    dropdownItems.push({ key: "save", label: displayText(chrome.save_view) });
  }
  if (canSaveAs) {
    dropdownItems.push({ key: "save_as", label: displayText(chrome.save_view_as) });
  }
  if (canRename) {
    dropdownItems.push({
      key: "rename",
      label: displayText(chrome.rename_view),
      icon: <EditOutlined />,
    });
  }
  if (canRemoveFromSidebar) {
    dropdownItems.push({ key: "remove_from_sidebar", label: displayText(chrome.remove_from_sidebar) });
  }
  if (canShare) {
    dropdownItems.push({
      key: "share",
      label: displayText(chrome.share_view),
      icon: <ShareAltOutlined />,
      disabled: true,
    });
  }
  if (canDelete) {
    if (dropdownItems.length > 0) {
      dropdownItems.push({ type: "divider" });
    }
    dropdownItems.push({
      key: "delete",
      label: displayText(chrome.delete_view),
      icon: <DeleteOutlined />,
      danger: true,
    });
  }

  if (dropdownItems.length === 0 && canSaveAs) {
    return (
      <Button
        size="small"
        className="list-header__save-view"
        disabled={disabled}
        onClick={() => onAction("save_as")}
      >
        {displayText(chrome.save_view_as)}
      </Button>
    );
  }

  if (dropdownItems.length === 0) {
    return null;
  }

  return (
    <Dropdown
      className="list-header__save-view-menu"
      disabled={disabled}
      menu={{
        items: dropdownItems,
        onClick: ({ key }) => onAction(key as SavedViewAction),
      }}
    >
      <Button size="small" className="list-header__save-view list-header__save-view--split">
        {displayText(chrome.save_view_as)}
        <DownOutlined className="list-header__save-view-caret" />
      </Button>
    </Dropdown>
  );
}
