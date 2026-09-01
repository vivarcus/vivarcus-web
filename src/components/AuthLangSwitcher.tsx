import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { LoginLang } from "../auth/rememberedUser";

type Props = {
  lang: LoginLang;
  onChange: (lang: LoginLang) => void;
};

export function AuthLangSwitcher({ lang, onChange }: Props) {
  return (
    <Dropdown
      menu={{
        items: [
          { key: "en", label: "English", onClick: () => onChange("en") },
          { key: "zh", label: "中文", onClick: () => onChange("zh") },
        ],
        selectable: true,
        selectedKeys: [lang],
      }}
    >
      <button type="button" className="auth-footer__lang">
        {lang === "zh" ? "中文" : "English"}
        <DownOutlined aria-hidden="true" />
      </button>
    </Dropdown>
  );
}
