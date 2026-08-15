import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import {
  CONFIG_GROUP_LABELS,
  CONFIG_GROUP_ORDER,
  readFavoriteComponentKeys,
  toggleConfigurationFavorite,
  visibleConfigurationComponents,
  type ConfigComponent,
  type ConfigComponentGroup,
  type ConfigComponentKey,
} from "../lib/configurationComponents";
import { displayText } from "../lib/i18n";
import { AdminPageShell } from "../components/admin/AdminPageShell";

function HubItem({
  item,
  favorited,
  onToggleFavorite,
}: {
  item: ConfigComponent;
  favorited: boolean;
  onToggleFavorite: (key: ConfigComponentKey) => void;
}) {
  return (
    <li className="config-hub__item">
      <button
        type="button"
        className={`config-hub__star${favorited ? " is-on" : ""}`}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorited}
        onClick={() => onToggleFavorite(item.key)}
      >
        ★
      </button>
      <Link to={item.route}>{displayText(item.label, item.defaultLabel)}</Link>
    </li>
  );
}

/** Veeva-style Configuration landing: categorized component directory. */
export function AdminConfigurationHubPage() {
  const vaultId = useVaultId();
  const navCtx = useOptionalNavigationContext();
  const { shell } = useUi();
  const components = useMemo(
    () => visibleConfigurationComponents(navCtx?.nav),
    [navCtx?.nav],
  );
  const [favoriteKeys, setFavoriteKeys] = useState<ConfigComponentKey[]>([]);

  useEffect(() => {
    if (!vaultId) {
      setFavoriteKeys([]);
      return;
    }
    setFavoriteKeys(readFavoriteComponentKeys(vaultId));
  }, [vaultId]);

  const grouped = useMemo(() => {
    const map = new Map<ConfigComponentGroup, ConfigComponent[]>();
    for (const g of CONFIG_GROUP_ORDER) map.set(g, []);
    for (const c of components) {
      map.get(c.group)?.push(c);
    }
    return CONFIG_GROUP_ORDER.map((group) => ({
      group,
      label: CONFIG_GROUP_LABELS[group],
      items: map.get(group) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [components]);

  const favoriteSet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);

  const onToggleFavorite = (key: ConfigComponentKey) => {
    if (!vaultId) return;
    setFavoriteKeys(toggleConfigurationFavorite(vaultId, key));
  };

  return (
    <AdminPageShell
      className="config-hub"
      title={displayText(shell.admin_configuration, "Configuration")}
    >

      <section className="config-hub__section">
        <h2 className="config-hub__section-title">
          {displayText(shell.admin_configuration_platform, "Platform Configurations")}
        </h2>
        <div className="config-hub__groups">
          {grouped.map((g) => (
            <div key={g.group} className="config-hub__group">
              <h3 className="config-hub__group-title">{g.label}</h3>
              <ul className="config-hub__list">
                {g.items.map((item) => (
                  <HubItem
                    key={item.key}
                    item={item}
                    favorited={favoriteSet.has(item.key)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </AdminPageShell>
  );
}
