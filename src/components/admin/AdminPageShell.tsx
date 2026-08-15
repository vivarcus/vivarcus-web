import type { ReactNode } from "react";

export type AdminPageShellProps = {
  title?: ReactNode;
  breadcrumb?: ReactNode;
  meta?: ReactNode;
  /** Header trailing controls (buttons, menus, etc.). */
  actions?: ReactNode;
  variant?: "default" | "list";
  className?: string;
  children: ReactNode;
};

/** Standard admin console page shell: `.page` + accent `page-header`. */
export function AdminPageShell({
  title,
  breadcrumb,
  meta,
  actions,
  variant = "default",
  className,
  children,
}: AdminPageShellProps) {
  const headerClass =
    variant === "list" ? "page-header page-header--list" : "page-header";
  const showHeader =
    title != null || breadcrumb != null || meta != null || actions != null;

  return (
    <div className={["page", "admin-page", className].filter(Boolean).join(" ")}>
      {showHeader ? (
        <header className={headerClass}>
          <div>
            {breadcrumb}
            {title != null ? <h1>{title}</h1> : null}
            {meta}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </div>
  );
}
