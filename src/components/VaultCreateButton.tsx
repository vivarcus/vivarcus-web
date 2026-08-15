import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { VaultCreateMenuItem } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { buildListCreateHref } from "../lib/listRouting";
import { CreateObjectTypeModal } from "./CreateObjectTypeModal";

type Props = {
  pinned?: VaultCreateMenuItem[] | null;
  recent?: VaultCreateMenuItem[] | null;
  loading?: boolean;
  className?: string;
};

function itemLabel(item: VaultCreateMenuItem) {
  const text = displayText(item.label, item.tab_api_name ?? item.object_api_name);
  if (item.show_plus === false) {
    return text;
  }
  return `+ ${text}`;
}

function objectLabelForItem(item: VaultCreateMenuItem) {
  if (item.object_label) {
    return displayText(item.object_label, item.object_api_name ?? item.tab_api_name);
  }
  return displayText(item.label, item.tab_api_name ?? item.object_api_name);
}

function buildMenuItems(
  pinned: VaultCreateMenuItem[] | null | undefined,
  recent: VaultCreateMenuItem[] | null | undefined,
  onTypeSelectionItem: (item: VaultCreateMenuItem) => void,
): MenuProps["items"] {
  const menuItemForTarget = (item: VaultCreateMenuItem): MenuProps["items"] => {
    if (
      item.object_api_name &&
      item.tab_api_name &&
      item.requires_type_selection &&
      (item.object_types?.length ?? 0) > 1
    ) {
      return [
        {
          key: `${item.tab_api_name}:${item.object_api_name}`,
          label: itemLabel(item),
          onClick: () => onTypeSelectionItem(item),
        },
      ];
    }

    if (!item.object_api_name || !item.tab_api_name) {
      return [
        {
          key: item.tab_api_name ?? item.object_api_name ?? item.kind ?? "item",
          label: itemLabel(item),
          disabled: true,
        },
      ];
    }

    const objectType =
      item.object_types?.length === 1
        ? item.object_types[0]?.api_name
        : item.default_object_type;

    return [
      {
        key: `${item.tab_api_name}:${item.object_api_name}`,
        label: (
          <Link
            to={buildListCreateHref(
              item.object_api_name,
              item.tab_api_name,
              objectType,
              item.list_routing,
            )}
          >
            {itemLabel(item)}
          </Link>
        ),
      },
    ];
  };

  const pinnedItems = pinned ?? [];
  const recentItems = recent ?? [];
  const items: MenuProps["items"] = pinnedItems.flatMap((item) => menuItemForTarget(item) ?? []);
  if (recentItems.length > 0) {
    if (items.length > 0) {
      items.push({ type: "divider", key: "recent-divider" });
    }
    items.push({
      key: "recent-heading",
      label: <span className="vault-create__recent-heading">RECENT</span>,
      disabled: true,
    });
    items.push(...recentItems.flatMap((item) => menuItemForTarget(item) ?? []));
  }
  return items;
}

export function VaultCreateButton({
  pinned,
  recent,
  loading = false,
  className = "tab-nav__create",
}: Props) {
  const { shell } = useUi();
  const navigate = useNavigate();
  const [typeModalItem, setTypeModalItem] = useState<VaultCreateMenuItem | null>(null);
  const pinnedItems = pinned ?? [];
  const recentItems = recent ?? [];
  if (!pinnedItems.length && !recentItems.length) {
    return null;
  }

  return (
    <>
      <Dropdown
        className="vault-create"
        menu={{
          items: buildMenuItems(pinnedItems, recentItems, (item) => setTypeModalItem(item)),
        }}
        trigger={["click"]}
        disabled={loading}
      >
        <Button type="primary" className={className} loading={loading}>
          {displayText(shell.list_create)}
        </Button>
      </Dropdown>
      {typeModalItem?.object_api_name && typeModalItem.tab_api_name && (
        <CreateObjectTypeModal
          open
          objectLabel={objectLabelForItem(typeModalItem)}
          objectTypes={typeModalItem.object_types ?? []}
          defaultObjectType={typeModalItem.default_object_type}
          onCancel={() => setTypeModalItem(null)}
          onConfirm={(objectType) => {
            navigate(
              buildListCreateHref(
                typeModalItem.object_api_name!,
                typeModalItem.tab_api_name!,
                objectType,
                typeModalItem.list_routing,
              ),
            );
            setTypeModalItem(null);
          }}
        />
      )}
    </>
  );
}
