import { Button, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

type Props = {
  id?: string;
  title?: ReactNode;
  titleCount?: number;
  helpContent?: string;
  headerPrefix?: ReactNode;
  headerExtra?: ReactNode;
  className?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
};

export function RecordSectionBlock({
  id,
  title,
  titleCount,
  helpContent,
  headerPrefix,
  headerExtra,
  className,
  collapsible = false,
  expanded = true,
  onToggle,
  children,
}: Props) {
  const showTitle =
    title !== undefined &&
    title !== null &&
    (typeof title !== "string" || title.trim() !== "");
  const sectionClass = [
    "record-section",
    className,
    collapsible && expanded ? "record-section--expanded" : "",
    collapsible && !expanded ? "record-section--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const helpNode =
    helpContent && helpContent.trim() !== "" ? (
      <Tooltip title={helpContent}>
        <QuestionCircleOutlined
          className="record-section__help"
          role="img"
          aria-label="Section help"
        />
      </Tooltip>
    ) : null;

  const countNode =
    titleCount !== undefined ? (
      <span className="record-section__count"> ({titleCount})</span>
    ) : null;

  const titleNode =
    typeof title === "string" || typeof title === "number" ? (
      <h2 className="record-section__title">
        {title}
        {countNode}
        {helpNode}
      </h2>
    ) : (
      title
    );

  return (
    <section id={id} className={sectionClass}>
      {showTitle &&
        (collapsible && onToggle ? (
          <Button
            type="text"
            block
            className="record-section__header"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <span className="record-section__chevron" aria-hidden>
              {expanded ? "▾" : "▸"}
            </span>
            {typeof title === "string" || typeof title === "number" ? (
              <span className="record-section__title">
                {title}
                {countNode}
                {helpNode}
              </span>
            ) : (
              title
            )}
          </Button>
        ) : (
          <header className="record-section__header record-section__header--static">
            {headerPrefix}
            {titleNode}
            {headerExtra}
          </header>
        ))}
      {(!collapsible || expanded) && <div className="record-section__body">{children}</div>}
    </section>
  );
}
