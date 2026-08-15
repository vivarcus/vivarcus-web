import { Result } from "antd";
import { Link } from "react-router-dom";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

export function ForbiddenPage() {
  const { shell } = useUi();

  return (
    <div className="admin-console__forbidden">
      <Result
        status="403"
        title={displayText(shell.forbidden_title)}
        subTitle={displayText(shell.forbidden_subtitle)}
        extra={
          <Link to="/" className="admin-console__forbidden-link">
            {displayText(shell.vault_home)}
          </Link>
        }
      />
    </div>
  );
}
