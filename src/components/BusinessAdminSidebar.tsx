import { Link } from "react-router-dom";
import type { BusinessAdminObjectOption, BusinessAdminObjectsSelectorModel } from "../api/types";
import { displayText } from "../lib/i18n";

type Props = {
  chrome?: BusinessAdminObjectsSelectorModel["chrome"];
  recent: BusinessAdminObjectOption[];
  favorites: BusinessAdminObjectOption[];
  activeApiName?: string;
  onSelect?: (apiName: string) => void;
};

function SidebarLink({
  obj,
  active,
  onSelect,
}: {
  obj: BusinessAdminObjectOption;
  active?: boolean;
  onSelect?: (apiName: string) => void;
}) {
  return (
    <Link
      to={`/business-admin/objects/${encodeURIComponent(obj.api_name)}`}
      className={`view-tab${active ? " view-tab--active" : ""}`}
      onClick={() => onSelect?.(obj.api_name)}
    >
      <span className="view-tab__label">{displayText(obj.label, obj.api_name)}</span>
    </Link>
  );
}

export function BusinessAdminSidebar({
  chrome,
  recent,
  favorites,
  activeApiName,
  onSelect,
}: Props) {
  return (
    <>
      <section className="sidebar-section">
        <h2 className="sidebar-section__title">
          {displayText(chrome?.recently_used_title, "Recently Used")}
        </h2>
        {recent.length === 0 ? null : (
          <nav className="view-tabs" aria-label={displayText(chrome?.recently_used_title, "Recently Used")}>
            {recent.map((obj) => (
              <SidebarLink
                key={`recent-${obj.api_name}`}
                obj={obj}
                active={activeApiName === obj.api_name}
                onSelect={onSelect}
              />
            ))}
          </nav>
        )}
      </section>

      <section className="sidebar-section">
        <h2 className="sidebar-section__title">
          {displayText(chrome?.favorites_title, "Favorites")}
        </h2>
        {favorites.length === 0 ? (
          <p className="business-admin-sidebar__empty">
            {displayText(chrome?.favorites_empty, "Add your favorites")}
          </p>
        ) : (
          <nav className="view-tabs" aria-label={displayText(chrome?.favorites_title, "Favorites")}>
            {favorites.map((obj) => (
              <SidebarLink
                key={`favorite-${obj.api_name}`}
                obj={obj}
                active={activeApiName === obj.api_name}
                onSelect={onSelect}
              />
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
