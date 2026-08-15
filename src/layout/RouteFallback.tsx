import { Spin } from "antd";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

export function RouteFallback() {
  const { shell } = useUi();
  return (
    <Spin
      description={displayText(shell.loading)}
      className="page-loading page__loading"
    />
  );
}
