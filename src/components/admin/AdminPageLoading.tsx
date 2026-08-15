import { Spin } from "antd";
import { useUi } from "../../context/UiContext";
import { displayText } from "../../lib/i18n";

export function AdminPageLoading({ description }: { description?: string }) {
  const { shell } = useUi();
  return (
    <div className="page admin-page admin-page--loading">
      <Spin
        description={description ?? displayText(shell.loading)}
        className="page-loading page__loading"
      />
    </div>
  );
}
