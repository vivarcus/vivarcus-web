import { useEffect, useState } from "react";
import { Spin } from "antd";
import type { DisplayContext, HoverCardModel } from "../api/types";
import { api } from "../api/client";
import { CompletenessHoverCard } from "./CompletenessHoverCard";

type IconModel = {
  name: string;
  color?: string;
  title?: string;
};

type Props = {
  recordId: string;
  vaultId: string;
  icon?: IconModel;
  tabApiName?: string;
  displayContext?: DisplayContext;
};

export function LazyCompletenessHoverCard({
  recordId,
  vaultId,
  icon,
  tabApiName,
  displayContext,
}: Props) {
  const [card, setCard] = useState<HoverCardModel | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setError(false);
    api
      .completenessHover(vaultId, recordId)
      .then((next) => {
        if (!cancelled) {
          setCard(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, recordId]);

  if (error) {
    return <div className="milestone-completeness-hovercard">—</div>;
  }
  if (!card) {
    return (
      <div className="milestone-completeness-hovercard milestone-completeness-hovercard--loading">
        <Spin size="small" />
      </div>
    );
  }
  return (
    <CompletenessHoverCard
      card={card}
      icon={icon}
      vaultId={vaultId}
      tabApiName={tabApiName}
      displayContext={displayContext}
    />
  );
}
