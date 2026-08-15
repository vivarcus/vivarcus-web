import { Tooltip } from "antd";
import type { ReactNode } from "react";

export function adminEllipsisCell(value: string | undefined) {
  const text = value || "";
  if (!text) return "—";
  return (
    <Tooltip title={text} placement="topLeft">
      <span className="admin-table__cell-ellipsis">{text}</span>
    </Tooltip>
  );
}

export function adminFirstColumnCell(value: string | undefined, main: ReactNode, actions: ReactNode | null) {
  if (!actions) return main;
  return (
    <div className="data-table__name-cell data-table__name-cell--with-actions">
      <span className="data-table__name-main">{main}</span>
      <div className="data-table__first-col-actions" onClick={(e) => e.stopPropagation()}>
        {actions}
      </div>
    </div>
  );
}
