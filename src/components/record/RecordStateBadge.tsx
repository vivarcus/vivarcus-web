import { CaretDownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useMemo } from "react";
import type { DisplayText, LifecycleAction } from "../../api/types";
import { displayText } from "../../lib/i18n";

type Props = {
  stateLabel?: DisplayText;
  changeStateActions: LifecycleAction[];
  lifecyclePending?: boolean;
  onLifecycleAction: (action: LifecycleAction) => void;
};

export function RecordStateBadge({
  stateLabel,
  changeStateActions,
  lifecyclePending,
  onLifecycleAction,
}: Props) {
  const badgeLabel = displayText(stateLabel, "Status");
  const showDropdown = changeStateActions.length > 0;

  const menuItems = useMemo<MenuProps["items"]>(
    () =>
      changeStateActions.map((action) => ({
        key: action.name,
        label: displayText(action.label, action.name),
        disabled: lifecyclePending,
        onClick: () => onLifecycleAction(action),
      })),
    [changeStateActions, lifecyclePending, onLifecycleAction],
  );

  const badge = (
    <span
      className={[
        "record-status-badge",
        showDropdown ? "record-status-badge--interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {badgeLabel}
      {showDropdown ? <CaretDownOutlined className="record-status-badge__caret" aria-hidden /> : null}
    </span>
  );

  if (!showDropdown) {
    return badge;
  }

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomLeft">
      <button type="button" className="record-status-badge__trigger" aria-haspopup="menu">
        {badge}
      </button>
    </Dropdown>
  );
}
