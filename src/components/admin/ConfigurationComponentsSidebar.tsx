import { Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NavigationModel } from "../../api/types";
import { useUi } from "../../context/UiContext";
import {
  matchConfigurationComponent,
  readFavoriteComponentKeys,
  readRecentComponentKeys,
  recordConfigurationRecent,
  resolveComponentsByKeys,
  toggleConfigurationFavorite,
  visibleConfigurationComponents,
  type ConfigComponent,
  type ConfigComponentKey,
} from "../../lib/configurationComponents";
import { displayText } from "../../lib/i18n";

function ComponentNavLink({
  item,
  active,
  favorited,
  onToggleFavorite,
}: {
  item: ConfigComponent;
  active: boolean;
  favorited: boolean;
  onToggleFavorite: (key: ConfigComponentKey) => void;
}) {
  return (
    <div className={`config-components-sidebar__row${active ? " is-active" : ""}`}>
      <Link
        to={item.route}
        className={`view-tab${active ? " view-tab--active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <span className="view-tab__label">{displayText(item.label, item.defaultLabel)}</span>
      </Link>
      <button
        type="button"
        className={`config-components-sidebar__star${favorited ? " is-on" : ""}`}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorited}
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite(item.key);
        }}
      >
        ★
      </button>
    </div>
  );
}

/** Veeva content_setup-style left rail: Components search + Recent + Favorites. */
export function ConfigurationComponentsSidebar({
  vaultId,
  nav,
}: {
  vaultId: string;
  nav: NavigationModel | null | undefined;
}) {
  const { shell } = useUi();
  const location = useLocation();
  const components = useMemo(() => visibleConfigurationComponents(nav), [nav]);
  const [query, setQuery] = useState("");
  const [recentKeys, setRecentKeys] = useState<ConfigComponentKey[]>(() =>
    readRecentComponentKeys(vaultId),
  );
  const [favoriteKeys, setFavoriteKeys] = useState<ConfigComponentKey[]>(() =>
    readFavoriteComponentKeys(vaultId),
  );

  useEffect(() => {
    setRecentKeys(readRecentComponentKeys(vaultId));
    setFavoriteKeys(readFavoriteComponentKeys(vaultId));
  }, [vaultId]);

  const active = matchConfigurationComponent(location.pathname, components);

  useEffect(() => {
    if (!vaultId || !active) return;
    setRecentKeys(recordConfigurationRecent(vaultId, active.key));
  }, [vaultId, active?.key]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return components.filter((c) => {
      const label = displayText(c.label, c.defaultLabel).toLowerCase();
      return label.includes(q) || c.key.includes(q);
    });
  }, [components, query]);

  const recent = resolveComponentsByKeys(recentKeys, components);
  const favorites = resolveComponentsByKeys(favoriteKeys, components);
  const favoriteSet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);

  const onToggleFavorite = (key: ConfigComponentKey) => {
    setFavoriteKeys(toggleConfigurationFavorite(vaultId, key));
  };

  return (
    <aside className="list-page__sidebar config-components-sidebar">
      <section className="sidebar-section">
        <h2 className="sidebar-section__title">
          {displayText(shell.admin_configuration_components, "Components")}
        </h2>
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.admin_configuration_search_components, "Search Components")}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={displayText(shell.admin_configuration_search_components, "Search Components")}
        />
        <Link to="/admin/configuration" className="config-components-sidebar__view-all">
          {displayText(shell.admin_configuration_view_all, "View All")}
        </Link>
        {query.trim() ? (
          <nav
            className="view-tabs"
            aria-label={displayText(shell.admin_configuration_search_components, "Search Components")}
          >
            {filtered.length === 0 ? (
              <p className="config-components-sidebar__empty">
                {displayText(shell.admin_configuration_no_matches, "No matching components")}
              </p>
            ) : (
              filtered.map((item) => (
                <ComponentNavLink
                  key={item.key}
                  item={item}
                  active={active?.key === item.key}
                  favorited={favoriteSet.has(item.key)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))
            )}
          </nav>
        ) : null}
      </section>

      {!query.trim() ? (
        <>
          <section className="sidebar-section">
            <h2 className="sidebar-section__title">
              {displayText(shell.admin_configuration_recently_used, "Recently Used")}
            </h2>
            {recent.length === 0 ? null : (
              <nav
                className="view-tabs"
                aria-label={displayText(shell.admin_configuration_recently_used, "Recently Used")}
              >
                {recent.map((item) => (
                  <ComponentNavLink
                    key={`recent-${item.key}`}
                    item={item}
                    active={active?.key === item.key}
                    favorited={favoriteSet.has(item.key)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </nav>
            )}
          </section>

          <section className="sidebar-section">
            <h2 className="sidebar-section__title">
              {displayText(shell.admin_configuration_favorites, "Favorites")}
            </h2>
            {favorites.length === 0 ? (
              <p className="config-components-sidebar__empty">
                {displayText(shell.admin_configuration_favorites_empty, "Add your favorites")}
              </p>
            ) : (
              <nav
                className="view-tabs"
                aria-label={displayText(shell.admin_configuration_favorites, "Favorites")}
              >
                {favorites.map((item) => (
                  <ComponentNavLink
                    key={`fav-${item.key}`}
                    item={item}
                    active={active?.key === item.key}
                    favorited={favoriteSet.has(item.key)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </nav>
            )}
          </section>
        </>
      ) : null}
    </aside>
  );
}
