import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../Breadcrumb";

type Props = {
  breadcrumb: BreadcrumbItem[];
  title: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  stages?: ReactNode;
  /** Top-right list position + prev/next (aligned with breadcrumb, Veeva-style). */
  nav?: ReactNode;
  /** Title-row actions (workflow / edit / overflow), right of the heading. */
  actions?: ReactNode;
  below?: ReactNode;
};

export function RecordPageHeader({
  breadcrumb,
  title,
  meta,
  leading,
  trailing,
  stages,
  nav,
  actions,
  below,
}: Props) {
  return (
    <header className="page-header page-header--record">
      <div className="page-header__top-row">
        <Breadcrumb items={breadcrumb} />
        {nav}
      </div>
      <div className="page-header__title-row">
        <div className="page-header__title-block">
          <div className="page-header__heading">
            {leading}
            <h1>{title}</h1>
            {trailing}
          </div>
          {meta}
        </div>
        {actions}
      </div>
      {stages}
      {below}
    </header>
  );
}
