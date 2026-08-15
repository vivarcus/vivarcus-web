import { Button, Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { NavigationModel, NavTab } from "../api/types";
import { saveLastTab } from "../lib/vaultNav";
import { isNavTabActive } from "../lib/navTabActive";
import { tabHref } from "../lib/tabHref";
import { displayText } from "../lib/i18n";
import { isNavigableTab } from "../lib/navTabUtils";

function matchesFilter(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function NavTabLink({
  vaultId,
  tab,
  activeTab,
  activePageApiName,
  onNavigate,
}: {
  vaultId: string;
  tab: NavTab;
  activeTab?: string;
  activePageApiName?: string;
  onNavigate?: () => void;
}) {
  const active = isNavTabActive(tab, activeTab, activePageApiName);
  return (
    <Link
      to={tabHref(vaultId, tab)}
      className={`nav-tab${active ? " nav-tab--active" : ""}`}
      onClick={() => {
        saveLastTab(vaultId, tab.api_name);
        onNavigate?.();
      }}
    >
      {displayText(tab.label, tab.api_name)}
    </Link>
  );
}

function NavSubtabs({
  vaultId,
  parent,
  activeTab,
  activePageApiName,
  onNavigate,
}: {
  vaultId: string;
  parent: NavTab;
  activeTab?: string;
  activePageApiName?: string;
  onNavigate?: () => void;
}) {
  const subtabs = parent.subtabs ?? [];
  if (subtabs.length === 0) return null;

  const childActive = subtabs.some((s) => isNavTabActive(s, activeTab, activePageApiName));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div className={`nav-subtabs${open ? " nav-subtabs--open" : ""}`}>
      <div className="nav-subtabs__head">
        {isNavigableTab(parent) ? (
          <NavTabLink
            vaultId={vaultId}
            tab={parent}
            activeTab={activeTab}
            activePageApiName={activePageApiName}
            onNavigate={onNavigate}
          />
        ) : (
          <span className="nav-tab nav-tab--menu">{displayText(parent.label, parent.api_name)}</span>
        )}
        <Button
          type="text"
          className="nav-subtabs__toggle"
          aria-expanded={open}
          aria-label={`${open ? "收起" : "展开"} ${displayText(parent.label, parent.api_name)} 子 Tab`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav-subtabs__chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </Button>
      </div>
      {open && (
        <div className="nav-subtabs__items">
          {subtabs.map((sub) => (
            <Link
              key={sub.api_name}
              to={tabHref(vaultId, sub)}
              className={`nav-subtab${isNavTabActive(sub, activeTab, activePageApiName) ? " nav-subtab--active" : ""}`}
              onClick={() => {
                saveLastTab(vaultId, sub.api_name);
                onNavigate?.();
              }}
            >
              {displayText(sub.label, sub.api_name)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navigation({
  vaultId,
  activeTab,
  activePageApiName,
  onNavigate,
}: {
  vaultId: string;
  activeTab?: string;
  activePageApiName?: string;
  onNavigate?: () => void;
}) {
  const [nav, setNav] = useState<NavigationModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.navigation(vaultId)
      .then((model) => {
        if (!cancelled) setNav(model);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  const filtered = useMemo(() => {
    if (!nav || !query.trim()) return nav;
    const q = query.trim();
    return {
      collections: nav.collections
        .map((collection) => ({
          ...collection,
          items: collection.items.filter((item) => {
            if (item.tab) {
              const labels = [
                displayText(item.tab.label, item.tab.api_name),
                ...(item.tab.subtabs?.map((s) => displayText(s.label, s.api_name)) ?? []),
              ];
              return labels.some((l) => matchesFilter(l, q));
            }
            if (item.menu_tabs?.length) {
              return (
                matchesFilter(displayText(item.label), q) ||
                item.menu_tabs.some((t) => {
                  const labels = [
                    displayText(t.label, t.api_name),
                    ...(t.subtabs?.map((s) => displayText(s.label, s.api_name)) ?? []),
                  ];
                  return labels.some((l) => matchesFilter(l, q));
                })
              );
            }
            return false;
          }),
        }))
        .filter((c) => c.items.length > 0),
    };
  }, [nav, query]);

  if (error) {
    return (
      <div className="nav-error">
        <p>{error}</p>
        <Button type="text" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }
  if (!filtered) {
    return <div className="nav-loading">加载导航…</div>;
  }

  return (
    <nav className="sidebar-nav" aria-label="主导航">
      <div className="nav-search">
        <Input
          className="nav-search__input"
          placeholder="筛选 Tab…"
          value={query}
          allowClear
          aria-label="筛选导航 Tab"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filtered.collections.length === 0 && (
        <p className="nav-empty">没有匹配的 Tab</p>
      )}
      {filtered.collections.map((collection) => (
        <section key={collection.api_name} className="nav-collection">
          <h2 className="nav-collection__title">{displayText(collection.label, collection.api_name)}</h2>
          <ul className="nav-collection__list">
            {collection.items.map((item, idx) => {
              if (item.tab) {
                const hasSubtabs = (item.tab.subtabs?.length ?? 0) > 0;
                return (
                  <li key={`${item.item_type}-${idx}`}>
                    {hasSubtabs ? (
                      <NavSubtabs
                        vaultId={vaultId}
                        parent={item.tab}
                        activeTab={activeTab}
                        activePageApiName={activePageApiName}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      <NavTabLink
                        vaultId={vaultId}
                        tab={item.tab}
                        activeTab={activeTab}
                        activePageApiName={activePageApiName}
                        onNavigate={onNavigate}
                      />
                    )}
                  </li>
                );
              }
              if (item.menu_tabs?.length) {
                return (
                  <li key={`menu-${idx}`} className="nav-menu">
                    <span className="nav-menu__label">{displayText(item.label)}</span>
                    <div className="nav-menu__tabs">
                      {item.menu_tabs.map((tab) => {
                        const subtabs = tab.subtabs ?? [];
                        if (subtabs.length > 0) {
                          return (
                            <NavSubtabs
                              key={tab.api_name}
                              vaultId={vaultId}
                              parent={tab}
                              activeTab={activeTab}
                              activePageApiName={activePageApiName}
                              onNavigate={onNavigate}
                            />
                          );
                        }
                        return (
                          <NavTabLink
                            key={tab.api_name}
                            vaultId={vaultId}
                            tab={tab}
                            activeTab={activeTab}
                            activePageApiName={activePageApiName}
                            onNavigate={onNavigate}
                          />
                        );
                      })}
                    </div>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
