import type { ReactNode } from "react";

type ShellProps = {
  header: ReactNode;
  alerts?: ReactNode;
  banner?: ReactNode;
  body?: ReactNode;
};

export function RecordPageShell({ header, alerts, banner, body }: ShellProps) {
  return (
    <div className="record-page">
      <div className="record-page__header">
        {header}
        {alerts}
      </div>
      {banner}
      {body}
    </div>
  );
}

type BodyProps = {
  sectionNav?: ReactNode;
  className?: string;
  mainClassName?: string;
  children: ReactNode;
};

export function RecordPageBody({ sectionNav, className, mainClassName, children }: BodyProps) {
  const mainClass = ["record-page__main", mainClassName].filter(Boolean).join(" ");
  return (
    <div className={className ?? "record-page__body"}>
      {sectionNav}
      <div className={mainClass}>{children}</div>
    </div>
  );
}
