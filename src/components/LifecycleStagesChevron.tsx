import type { LifecycleChevron } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

type Props = {
  chevron: LifecycleChevron;
};

function stagePhase(
  stages: NonNullable<LifecycleChevron["stages"]>,
  index: number,
): "past" | "current" | "future" {
  const currentIndex = stages.findIndex((stage) => stage.current);
  if (currentIndex < 0) {
    return "future";
  }
  if (index < currentIndex) {
    return "past";
  }
  if (index === currentIndex) {
    return "current";
  }
  return "future";
}

export function LifecycleStagesChevron({ chevron }: Props) {
  const { shell } = useUi();
  if (!chevron.visible || (chevron.stages?.length ?? 0) === 0) {
    return null;
  }

  const stages = chevron.stages!;

  return (
    <nav className="lifecycle-chevron" aria-label={displayText(shell.lifecycle_stages_aria)}>
      <ol className="lifecycle-chevron__list">
        {stages.map((stage, index) => {
          const phase = stagePhase(stages, index);
          const positionClass =
            stages.length === 1
              ? "lifecycle-chevron__stage--solo"
              : index === 0
                ? "lifecycle-chevron__stage--first"
                : index === stages.length - 1
                  ? "lifecycle-chevron__stage--last"
                  : "lifecycle-chevron__stage--middle";
          return (
            <li
              key={stage.api_name}
              className={`lifecycle-chevron__stage lifecycle-chevron__stage--${phase} ${positionClass}`}
              aria-current={phase === "current" ? "step" : undefined}
            >
              <span className="lifecycle-chevron__label">
                {displayText(stage.label, stage.api_name)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
