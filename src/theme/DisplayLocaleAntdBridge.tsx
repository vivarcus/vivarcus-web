import { ConfigProvider } from "antd";
import { useEffect, useMemo, type ReactNode } from "react";
import { useUi } from "../context/UiContext";
import { antdLocaleForDisplay, applyDayjsLocale } from "../lib/i18n/antdLocale";

/** Applies vault/user display locale to Ant Design and dayjs (DatePicker panel text). */
export function DisplayLocaleAntdBridge({ children }: { children: ReactNode }) {
  const { displayContext } = useUi();
  const locale = useMemo(() => antdLocaleForDisplay(displayContext), [displayContext]);

  useEffect(() => {
    applyDayjsLocale(displayContext);
  }, [displayContext]);

  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
}
