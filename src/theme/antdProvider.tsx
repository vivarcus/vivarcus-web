import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

/**
 * Ant Design root provider for the Vivarcus SPA.
 *
 * Plan (CAP-UI ADR-2): use antd presentation components only; data and
 * permission trimming stay on server ViewModel endpoints. Do not use
 * Ant Design Pro components with built-in data fetching (ProTable, ProForm).
 */
const vivarcusTheme = {
  token: {
    colorPrimary: "#006dcc",
    colorError: "#b42318",
    borderRadius: 2,
    // antd token 不支持 var() 注入；字号与 tokens.css --font-size-root 配套（15px 根 × 0.93 ≈ 14px）。
    fontSize: 14,
    // antd token 不支持 var() 注入，须与 tokens.css 的 --font-sans 字面量保持一致。
    fontFamily:
      '"Segoe UI", system-ui, -apple-system, "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif',
  },
};

type Props = {
  children: ReactNode;
};

export function AntdProvider({ children }: Props) {
  return <ConfigProvider theme={vivarcusTheme}>{children}</ConfigProvider>;
}
