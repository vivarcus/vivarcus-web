import { Link } from "react-router-dom";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { shell } = useUi();
  if (items.length === 0) return null;
  return (
    <nav className="breadcrumb" aria-label={displayText(shell.breadcrumb_aria)}>
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          // Callers that name the current page pass it without `to`; everything
          // with a `to` is an ancestor and must stay clickable, last or not.
          const isCurrent = index === items.length - 1 && !item.to;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumb__item">
              {item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
