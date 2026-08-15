import { EllipsisOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { defaultRelatedChrome, displayText } from "../../lib/i18n";

type Props = {
  items: MenuProps["items"];
  loading?: boolean;
};

export function AdminRowActionMenu({ items, loading }: Props) {
  if (!items || items.length === 0) return null;
  return (
    <div className="related-section__row-actions">
      <Dropdown
        menu={{ items }}
        trigger={["click"]}
        placement="bottomLeft"
        getPopupContainer={() => document.body}
      >
        <Button
          type="text"
          size="small"
          className="related-section__row-menu-trigger"
          icon={<EllipsisOutlined />}
          aria-label={displayText(defaultRelatedChrome.actions)}
          title={displayText(defaultRelatedChrome.actions)}
          loading={loading}
        />
      </Dropdown>
    </div>
  );
}
