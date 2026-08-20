import { Popover } from "antd";
import { CompletenessHoverCard } from "../components/CompletenessHoverCard";
import { FormulaIcon } from "./formulaIcon";
import type { DisplayRendererProps } from "./types";

export function DisplayIconRenderer({
  fieldRender,
  hoverCard,
  vaultId,
  tabApiName,
  displayContext,
}: DisplayRendererProps) {
  const icon = fieldRender?.icon;
  if (!icon?.name) {
    return <span className="field-icon field-icon--empty">—</span>;
  }
  const iconNode = (
    <span
      className="field-icon"
      title={hoverCard ? undefined : icon.title || icon.name}
      aria-label={icon.title || icon.name}
    >
      <FormulaIcon name={icon.name} color={icon.color} />
    </span>
  );
  if (!hoverCard) {
    return iconNode;
  }
  return (
    <Popover
      overlayClassName="milestone-completeness-hovercard-popover"
      content={
        <CompletenessHoverCard
          card={hoverCard}
          icon={icon}
          vaultId={vaultId}
          tabApiName={tabApiName}
          displayContext={displayContext}
        />
      }
      trigger="hover"
      placement="rightTop"
      mouseEnterDelay={0.15}
      getPopupContainer={() => document.body}
    >
      <span className="field-icon-wrap">{iconNode}</span>
    </Popover>
  );
}
