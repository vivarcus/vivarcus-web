import { Popover } from "antd";
import { useState } from "react";
import { CompletenessHoverCard } from "../components/CompletenessHoverCard";
import { LazyCompletenessHoverCard } from "../components/LazyCompletenessHoverCard";
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
  const [hoverActive, setHoverActive] = useState(false);
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
  const lazyRecordId = hoverCard.lazy ? hoverCard.milestone_record_id?.trim() : "";
  const canLazyLoad = Boolean(lazyRecordId && vaultId);
  return (
    <Popover
      overlayClassName="milestone-completeness-hovercard-popover"
      content={
        canLazyLoad && hoverActive ? (
          <LazyCompletenessHoverCard
            recordId={lazyRecordId!}
            vaultId={vaultId!}
            icon={icon}
            tabApiName={tabApiName}
            displayContext={displayContext}
          />
        ) : canLazyLoad ? (
          <div className="milestone-completeness-hovercard milestone-completeness-hovercard--loading" />
        ) : (
          <CompletenessHoverCard
            card={hoverCard}
            icon={icon}
            vaultId={vaultId}
            tabApiName={tabApiName}
            displayContext={displayContext}
          />
        )
      }
      trigger="hover"
      placement="rightTop"
      mouseEnterDelay={0.15}
      onOpenChange={(open) => {
        if (open) {
          setHoverActive(true);
        }
      }}
      getPopupContainer={() => document.body}
    >
      <span className="field-icon-wrap">{iconNode}</span>
    </Popover>
  );
}
