import type { ReactNode } from "react";

export type AdminPageSectionProps = {
  title: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Section block with optional note and inline actions on an accent underline title row. */
export function AdminPageSection({
  title,
  note,
  actions,
  className,
  children,
}: AdminPageSectionProps) {
  return (
    <section className={["admin-page__section", className].filter(Boolean).join(" ")}>
      <div className="admin-page__section-header">
        {note ? <span className="admin-page__section-note">{note}</span> : null}
        <div className="admin-page__section-header-row">
          <h2 className="admin-page__section-title">{title}</h2>
          {actions ? <div className="admin-page__section-actions">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
