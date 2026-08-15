import { DownOutlined, SearchOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { useNavigationContext } from "../context/NavigationContext";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { getLastTab } from "../lib/vaultNav";
import {
  DEFAULT_SEARCH_TAB,
  listSearchableObjectTabs,
  resolveHeaderSearchTab,
} from "../lib/globalSearchTab";
import { findTabInNav } from "../lib/navObjects";

type Props = {
  vaultId: string;
};

export function GlobalHeaderSearch({ vaultId }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tabMatch = useMatch("/tabs/:tabApiName/*");
  const { nav } = useNavigationContext();
  const { shell } = useUi();
  // Only hide when the server explicitly denies search.
  const searchDenied = nav?.capabilities?.can_search === false;

  const onVaultHome = location.pathname === "/" || location.pathname === "";
  const contextTabApiName =
    tabMatch?.params.tabApiName ??
    searchParams.get("tab") ??
    (onVaultHome ? undefined : getLastTab(vaultId));

  const scopes = useMemo(() => listSearchableObjectTabs(nav), [nav]);
  const defaultTarget = resolveHeaderSearchTab(nav, contextTabApiName ?? undefined);

  const [scopeTab, setScopeTab] = useState(defaultTarget);
  const urlQuery =
    tabMatch?.params.tabApiName && tabMatch.params.tabApiName === scopeTab
      ? (searchParams.get("q") ?? "")
      : "";
  const [draft, setDraft] = useState(urlQuery);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    setScopeTab(defaultTarget);
  }, [defaultTarget, vaultId]);

  useEffect(() => {
    setDraft(urlQuery);
  }, [urlQuery, location.pathname, vaultId]);

  if (searchDenied) {
    return null;
  }

  const scopeFromList = scopes.find((scope) => scope.apiName === scopeTab)?.label;
  const scopeFromNav = (() => {
    if (!nav) return "";
    const tab = findTabInNav(nav, scopeTab);
    return tab ? displayText(tab.label, tab.api_name) : "";
  })();
  const scopeLabel = scopeFromList || scopeFromNav || scopeTab || DEFAULT_SEARCH_TAB;
  const placeholder = displayText(shell.global_search_placeholder);
  const ariaLabel = displayText(shell.global_search_aria);
  const submitLabel = displayText(shell.global_search_submit);

  const scopeMenuItems: MenuProps["items"] = scopes.map((scope) => ({
    key: scope.apiName,
    label: scope.label,
    className:
      scope.apiName === scopeTab ? "global-header-search__scope-item--selected" : undefined,
    onClick: () => {
      setScopeTab(scope.apiName);
      setScopeOpen(false);
    },
  }));

  function submit(raw: string) {
    const q = raw.trim();
    const target = scopeTab.trim() || DEFAULT_SEARCH_TAB;
    const params = new URLSearchParams();
    if (q) {
      params.set("q", q);
    }
    if (tabMatch?.params.tabApiName === target) {
      const facets = searchParams.get("facet_filters");
      if (facets) {
        params.set("facet_filters", facets);
      }
    }
    const suffix = params.toString();
    navigate(`/tabs/${encodeURIComponent(target)}${suffix ? `?${suffix}` : ""}`);
  }

  return (
    <form
      className="global-header-search"
      role="search"
      aria-label={ariaLabel}
      onSubmit={(event) => {
        event.preventDefault();
        submit(draft);
      }}
    >
      <div className="global-header-search__bar">
        <Dropdown
          menu={{ items: scopeMenuItems }}
          trigger={["click"]}
          open={scopeOpen}
          onOpenChange={setScopeOpen}
          placement="bottomLeft"
          popupRender={(menu) => (
            <div className="dropdown__panel global-header-search__scope-panel">{menu}</div>
          )}
        >
          <button
            type="button"
            className={[
              "global-header-search__scope",
              scopeOpen ? "global-header-search__scope--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={`${displayText(shell.global_search_scope)}: ${scopeLabel}`}
            aria-expanded={scopeOpen}
          >
            <span className="global-header-search__scope-label">{scopeLabel}</span>
            <DownOutlined className="global-header-search__scope-caret" aria-hidden />
          </button>
        </Dropdown>
        <span className="global-header-search__divider" aria-hidden />
        <input
          className="global-header-search__input"
          type="search"
          value={draft}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="global-header-search__submit"
          aria-label={submitLabel}
          title={submitLabel}
        >
          <SearchOutlined aria-hidden />
        </button>
      </div>
    </form>
  );
}
