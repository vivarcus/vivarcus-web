import { Alert, Button, Dropdown, Spin } from "antd";
import type { DropdownProps } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { NavCollection, NavTab, NavigationModel } from "../api/types";
import { useEffect, useMemo, useState, forwardRef } from "react";
import { displayText } from "../lib/i18n";
import { isNavTabActive } from "../lib/navTabActive";
import { ADMIN_HOME } from "../lib/adminNav";
import {
  collectionHasActiveEntry,
  collectionKind,
  entriesFromCollection,
  entryContainsActiveTab,
  findActiveTabMeta,
  findAdminCollection,
  findBusinessAdminCollection,
  findCollectionForActiveTab,
  firstTabInCollection,
  isManagementCollection,
  type NavEntry,
} from "../lib/navCollection";
import { getLastCollection, saveLastCollection, saveLastTab } from "../lib/vaultNav";
import { tabHref } from "../lib/tabHref";
import { isNavigableTab, tabContainsActiveNavTarget } from "../lib/navTabUtils";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useUi } from "../context/UiContext";
import { useTabListActions } from "../hooks/useTabListActions";
import { useVaultCreateMenu } from "../hooks/useVaultCreateMenu";
import { useTabNavOverflow } from "../hooks/useTabNavOverflow";
import { ListCreateButton } from "../components/ListCreateButton";
import { VaultCreateButton } from "../components/VaultCreateButton";

function CollectionLabelTab({
  vaultId,
  collection,
  entries,
  activeTab,
  activePageApiName,
  pathname,
}: {
  vaultId: string;
  collection: NavCollection;
  entries: NavEntry[];
  activeTab?: string;
  activePageApiName?: string;
  pathname: string;
}) {
  const href = firstTabInCollection(vaultId, collection);
  const childActive = collectionHasActiveEntry(entries, activeTab, activePageApiName, pathname);
  const label = displayText(collection.label, collection.api_name);
  const collectionActive = !childActive;

  if (!href) {
    return (
      <span
        className={`tab-nav__link tab-nav__link--collection${collectionActive ? " tab-nav__link--active" : ""}`}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      to={href}
      className={`tab-nav__link tab-nav__link--collection${collectionActive ? " tab-nav__link--active" : ""}`}
    >
      {label}
    </Link>
  );
}

function VaultAITabSparkle() {
  return (
    <svg className="tab-nav__ai-sparkle" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M8 0.6 9.35 6.05 14.9 7.4 9.35 8.75 8 14.3 6.65 8.75 1.1 7.4 6.65 6.05Z"
      />
    </svg>
  );
}

function isVaultAINavTab(tab: NavTab): boolean {
  return tab.kind === "vault_ai" || tab.api_name === "vault_ai__sys";
}

function TabLink({
  vaultId,
  tab,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
}: {
  vaultId: string;
  tab: NavTab;
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
}) {
  const active = isNavTabActive(tab, activeTab, activePageApiName, pathname);
  const vaultAI = isVaultAINavTab(tab);
  return (
    <Link
      to={tabHref(vaultId, tab)}
      className={`tab-nav__link${active ? " tab-nav__link--active" : ""}${vaultAI ? " tab-nav__link--vault-ai" : ""}`}
      onClick={() => {
        saveLastTab(vaultId, tab.api_name);
        onNavigate?.();
      }}
    >
      {vaultAI ? <VaultAITabSparkle /> : null}
      {displayText(tab.label, tab.api_name)}
    </Link>
  );
}

function TabDropdown({
  vaultId,
  label,
  tabs,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
  flattenSubtabs = false,
}: {
  vaultId: string;
  label: string;
  tabs: NavTab[];
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
  flattenSubtabs?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const childActive = tabs.some((tab) =>
    tabContainsActiveNavTarget(tab, (candidate) =>
      isNavTabActive(candidate, activeTab, activePageApiName, pathname),
    ),
  );

  function closeMenu() {
    setOpen(false);
  }

  const popupRender: DropdownProps["popupRender"] = () => (
    <div className="dropdown__panel tab-nav__menu-panel" role="menu">
      {tabs.map((tab) => {
        const subtabs = tab.subtabs ?? [];
        if (subtabs.length === 0 || flattenSubtabs) {
          return (
            <Link
              key={tab.api_name}
              to={tabHref(vaultId, tab)}
              role="menuitem"
              className={`tab-nav__menu-item${isNavTabActive(tab, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
              onClick={() => {
                saveLastTab(vaultId, tab.api_name);
                closeMenu();
                onNavigate?.();
              }}
            >
              {displayText(tab.label, tab.api_name)}
            </Link>
          );
        }
        return (
          <div key={tab.api_name} className="tab-nav__menu-group">
            {isNavigableTab(tab) ? (
              <Link
                to={tabHref(vaultId, tab)}
                role="menuitem"
                className={`tab-nav__menu-item${isNavTabActive(tab, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
                onClick={() => {
                  saveLastTab(vaultId, tab.api_name);
                  closeMenu();
                  onNavigate?.();
                }}
              >
                {displayText(tab.label, tab.api_name)}
              </Link>
            ) : (
              <div className="tab-nav__menu-group-label" role="presentation">
                {displayText(tab.label, tab.api_name)}
              </div>
            )}
            {subtabs.map((sub) => (
              <Link
                key={sub.api_name}
                to={tabHref(vaultId, sub)}
                role="menuitem"
                className={`tab-nav__menu-item tab-nav__menu-item--nested${isNavTabActive(sub, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
                onClick={() => {
                  saveLastTab(vaultId, sub.api_name);
                  closeMenu();
                  onNavigate?.();
                }}
              >
                {displayText(sub.label, sub.api_name)}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomLeft"
      popupRender={popupRender}
    >
      <Button
        type="text"
        className={`tab-nav__link tab-nav__menu-trigger${childActive ? " tab-nav__link--active" : ""}`}
      >
        {label}
        <span className="tab-nav__chevron" aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}

function TabWithSubtabs({
  vaultId,
  tab,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
  flattenSubtabs = false,
}: {
  vaultId: string;
  tab: NavTab;
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
  flattenSubtabs?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const subtabs = tab.subtabs ?? [];
  if (subtabs.length === 0 || flattenSubtabs) {
    return (
      <TabLink
        vaultId={vaultId}
        tab={tab}
        activeTab={activeTab}
        activePageApiName={activePageApiName}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }

  const isActive = (candidate: NavTab) =>
    isNavTabActive(candidate, activeTab, activePageApiName, pathname);
  const childActive = tabContainsActiveNavTarget(tab, isActive);
  const showParentLink = isNavigableTab(tab);

  function closeMenu() {
    setOpen(false);
  }

  const popupRender: DropdownProps["popupRender"] = () => (
    <div className="dropdown__panel tab-nav__menu-panel" role="menu">
      {showParentLink && (
        <Link
          to={tabHref(vaultId, tab)}
          role="menuitem"
          className={`tab-nav__menu-item${isActive(tab) ? " tab-nav__menu-item--active" : ""}`}
          onClick={() => {
            saveLastTab(vaultId, tab.api_name);
            closeMenu();
            onNavigate?.();
          }}
        >
          {displayText(tab.label, tab.api_name)}
        </Link>
      )}
      {subtabs.map((sub) => (
        <Link
          key={sub.api_name}
          to={tabHref(vaultId, sub)}
          role="menuitem"
          className={`tab-nav__menu-item tab-nav__menu-item--nested${isNavTabActive(sub, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
          onClick={() => {
            saveLastTab(vaultId, sub.api_name);
            closeMenu();
            onNavigate?.();
          }}
        >
          {displayText(sub.label, sub.api_name)}
        </Link>
      ))}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomLeft"
      popupRender={popupRender}
    >
      <Button
        type="text"
        className={`tab-nav__link tab-nav__menu-trigger${childActive ? " tab-nav__link--active" : ""}`}
      >
        {displayText(tab.label, tab.api_name)}
        <span className="tab-nav__chevron" aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}

function NavEntryItem({
  vaultId,
  entry,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
  flattenSubtabs = false,
}: {
  vaultId: string;
  entry: NavEntry;
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
  flattenSubtabs?: boolean;
}) {
  if (entry.kind === "menu") {
    return (
      <TabDropdown
        vaultId={vaultId}
        label={displayText(entry.label)}
        tabs={entry.tabs}
        activeTab={activeTab}
        activePageApiName={activePageApiName}
        pathname={pathname}
        onNavigate={onNavigate}
        flattenSubtabs={flattenSubtabs}
      />
    );
  }
  return (
    <TabWithSubtabs
      vaultId={vaultId}
      tab={entry.tab}
      activeTab={activeTab}
      activePageApiName={activePageApiName}
      pathname={pathname}
      onNavigate={onNavigate}
      flattenSubtabs={flattenSubtabs}
    />
  );
}

const TabOverflowTrigger = forwardRef<
  HTMLButtonElement,
  {
    moreAriaLabel: string;
    active?: boolean;
    tabIndex?: number;
    measure?: boolean;
  }
>(function TabOverflowTrigger(
  { moreAriaLabel, active = false, tabIndex, measure = false },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="text"
      tabIndex={tabIndex}
      aria-label={measure ? undefined : moreAriaLabel}
      aria-hidden={measure || undefined}
      title={measure ? undefined : moreAriaLabel}
      className={`tab-nav__overflow-trigger${active ? " tab-nav__link--active" : ""}`}
    >
      <span className="tab-nav__overflow-icon" aria-hidden="true" />
    </Button>
  );
});

function overflowTriggerButtonProps({
  moreAriaLabel,
  active = false,
  open = false,
}: {
  moreAriaLabel: string;
  active?: boolean;
  open?: boolean;
}) {
  return {
    type: "text" as const,
    "aria-label": moreAriaLabel,
    title: moreAriaLabel,
    className: `tab-nav__overflow-trigger${active ? " tab-nav__link--active" : ""}${open ? " tab-nav__overflow-trigger--open" : ""}`,
  };
}

function OverflowExpandableMenuItem({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(Boolean(active));

  return (
    <div className="tab-nav__overflow-group">
      <button
        type="button"
        role="menuitem"
        aria-expanded={expanded}
        className={`tab-nav__menu-item tab-nav__menu-item--expandable${active ? " tab-nav__menu-item--active" : ""}${expanded ? " tab-nav__menu-item--expanded" : ""}`}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="tab-nav__menu-item-label">{label}</span>
        <span className="tab-nav__menu-expand-chevron" aria-hidden="true" />
      </button>
      {expanded ? (
        <div className="tab-nav__overflow-submenu" role="group">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function OverflowTabMenuItems({
  vaultId,
  tabs,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
  onClose,
  flattenSubtabs = false,
}: {
  vaultId: string;
  tabs: NavTab[];
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
  onClose: () => void;
  flattenSubtabs?: boolean;
}) {
  return (
    <>
      {tabs.map((tab) => {
        const subtabs = tab.subtabs ?? [];
        if (subtabs.length === 0 || flattenSubtabs) {
          return (
            <Link
              key={tab.api_name}
              to={tabHref(vaultId, tab)}
              role="menuitem"
              className={`tab-nav__menu-item${isNavTabActive(tab, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
              onClick={() => {
                saveLastTab(vaultId, tab.api_name);
                onClose();
                onNavigate?.();
              }}
            >
              {displayText(tab.label, tab.api_name)}
            </Link>
          );
        }
        return (
          <OverflowExpandableMenuItem
            key={tab.api_name}
            label={displayText(tab.label, tab.api_name)}
            active={tabContainsActiveNavTarget(tab, (candidate) =>
              isNavTabActive(candidate, activeTab, activePageApiName, pathname),
            )}
          >
            {isNavigableTab(tab) && (
              <Link
                to={tabHref(vaultId, tab)}
                role="menuitem"
                className={`tab-nav__menu-item tab-nav__menu-item--nested${isNavTabActive(tab, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
                onClick={() => {
                  saveLastTab(vaultId, tab.api_name);
                  onClose();
                  onNavigate?.();
                }}
              >
                {displayText(tab.label, tab.api_name)}
              </Link>
            )}
            {subtabs.map((sub) => (
              <Link
                key={sub.api_name}
                to={tabHref(vaultId, sub)}
                role="menuitem"
                className={`tab-nav__menu-item tab-nav__menu-item--nested${isNavTabActive(sub, activeTab, activePageApiName, pathname) ? " tab-nav__menu-item--active" : ""}`}
                onClick={() => {
                  saveLastTab(vaultId, sub.api_name);
                  onClose();
                  onNavigate?.();
                }}
              >
                {displayText(sub.label, sub.api_name)}
              </Link>
            ))}
          </OverflowExpandableMenuItem>
        );
      })}
    </>
  );
}

function TabOverflowMenu({
  vaultId,
  entries,
  moreAriaLabel,
  activeTab,
  activePageApiName,
  pathname,
  onNavigate,
  flattenSubtabs = false,
}: {
  vaultId: string;
  entries: NavEntry[];
  moreAriaLabel: string;
  activeTab?: string;
  activePageApiName?: string;
  pathname?: string;
  onNavigate?: () => void;
  flattenSubtabs?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const childActive = entries.some((entry) =>
    entryContainsActiveTab(entry, activeTab, activePageApiName, pathname),
  );

  function closeMenu() {
    setOpen(false);
  }

  const popupRender: DropdownProps["popupRender"] = () => (
    <div className="dropdown__panel tab-nav__menu-panel tab-nav__overflow-panel" role="menu">
      {entries.map((entry, index) => {
        if (entry.kind === "menu") {
          return (
            <OverflowExpandableMenuItem
              key={`${displayText(entry.label)}-${index}`}
              label={displayText(entry.label)}
              active={entry.tabs.some((tab) =>
                tabContainsActiveNavTarget(tab, (candidate) =>
                  isNavTabActive(candidate, activeTab, activePageApiName, pathname),
                ),
              )}
            >
              <OverflowTabMenuItems
                vaultId={vaultId}
                tabs={entry.tabs}
                activeTab={activeTab}
                activePageApiName={activePageApiName}
                pathname={pathname}
                onNavigate={onNavigate}
                onClose={closeMenu}
                flattenSubtabs={flattenSubtabs}
              />
            </OverflowExpandableMenuItem>
          );
        }
        return (
          <OverflowTabMenuItems
            key={entry.tab.api_name}
            vaultId={vaultId}
            tabs={[entry.tab]}
            activeTab={activeTab}
            activePageApiName={activePageApiName}
            pathname={pathname}
            onNavigate={onNavigate}
            onClose={closeMenu}
            flattenSubtabs={flattenSubtabs}
          />
        );
      })}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      destroyOnHidden
      popupRender={popupRender}
    >
      <Button {...overflowTriggerButtonProps({ moreAriaLabel, active: childActive, open })}>
        <span className="tab-nav__overflow-icon" aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}

function CollectionIcon({ kind }: { kind: ReturnType<typeof collectionKind> }) {
  return <span className={`tab-nav__collection-icon tab-nav__collection-icon--${kind}`} aria-hidden="true" />;
}

export function TabNav({
  vaultId,
  nav: navProp,
  activeTab,
  activePageApiName,
  isAdminRoute = false,
  isBusinessAdminRoute = false,
  onCollectionSwitch,
}: {
  vaultId: string;
  nav?: NavigationModel | null;
  activeTab?: string;
  activePageApiName?: string;
  isAdminRoute?: boolean;
  isBusinessAdminRoute?: boolean;
  onCollectionSwitch?: () => void;
}) {
  const { shell } = useUi();
  // AppShell always passes nav from NavigationProvider; fall back to context for
  // standalone TabNav mounts instead of issuing another GET /ui/navigation.
  const ctxNav = useOptionalNavigationContext();
  const nav = navProp ?? ctxNav?.nav ?? null;
  const error = navProp ? null : ctxNav?.error ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [collectionApiName, setCollectionApiName] = useState<string | undefined>();

  const collections = nav?.collections ?? [];

  const activeCollection = useMemo(
    () => collections.find((c) => c.api_name === collectionApiName) ?? collections[0],
    [collections, collectionApiName],
  );

  const showManagementTabs = activeCollection ? isManagementCollection(activeCollection) : false;

  useEffect(() => {
    setCollectionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (collections.length === 0) return;

    if (isAdminRoute) {
      const adminCollection = findAdminCollection(collections);
      if (adminCollection) {
        setCollectionApiName(adminCollection.api_name);
        saveLastCollection(vaultId, adminCollection.api_name);
      }
      return;
    }

    if (isBusinessAdminRoute) {
      const businessAdminCollection = findBusinessAdminCollection(collections);
      if (businessAdminCollection) {
        setCollectionApiName(businessAdminCollection.api_name);
        saveLastCollection(vaultId, businessAdminCollection.api_name);
      }
      return;
    }

    const matched = findCollectionForActiveTab(
      collections,
      activeTab,
      activePageApiName,
      location.pathname,
    );
    if (matched) {
      setCollectionApiName(matched.api_name);
      saveLastCollection(vaultId, matched.api_name);
      return;
    }

    const saved = getLastCollection(vaultId);
    const savedExists = saved && collections.some((c) => c.api_name === saved);
    setCollectionApiName(savedExists ? saved! : collections[0].api_name);
  }, [vaultId, collections, isAdminRoute, isBusinessAdminRoute, activeTab, activePageApiName]);

  const entries = useMemo(
    () => (activeCollection ? entriesFromCollection(activeCollection) : []),
    [activeCollection],
  );

  const activeTabMeta = useMemo(
    () =>
      findActiveTabMeta(nav?.collections ?? [], activeTab, activePageApiName) ??
      (activeTab && activeCollection
        ? entriesFromCollection(activeCollection)
            .flatMap((entry) =>
              entry.kind === "tab"
                ? [entry.tab, ...(entry.tab.subtabs ?? [])]
                : entry.tabs,
            )
            .find((tab) => isNavTabActive(tab, activeTab, activePageApiName))
        : undefined),
    [nav?.collections, activeTab, activePageApiName, activeCollection],
  );

  const createTabApiName =
    !showManagementTabs && activeTabMeta?.kind === "object" ? activeTabMeta.api_name : undefined;
  const onVaultHome = location.pathname === "/" || location.pathname === "";
  const isHomeTab =
    !showManagementTabs &&
    (onVaultHome ||
      activeTabMeta?.kind === "task_dashboard" ||
      activeTabMeta?.api_name === "home__v");
  const createActions = useTabListActions(vaultId, createTabApiName, Boolean(createTabApiName));
  const { menu: vaultCreateMenu, loading: vaultCreateLoading } = useVaultCreateMenu(
    vaultId,
    isHomeTab,
  );
  const overflowResetKey = `${collectionApiName ?? ""}:${location.pathname}:${entries.length}`;
  const {
    containerRef,
    measureRowRef,
    prefixMeasureRef,
    moreMeasureRef,
    visibleCount,
    overflowCount,
  } = useTabNavOverflow(entries.length, overflowResetKey);
  const visibleEntries = entries.slice(0, visibleCount);
  const overflowEntries = entries.slice(visibleCount);
  const moreAriaLabel = displayText(shell.tab_more_label);

  function closeCollectionsMenu() {
    setCollectionsOpen(false);
  }

  function selectCollection(collection: NavCollection) {
    saveLastCollection(vaultId, collection.api_name);
    setCollectionApiName(collection.api_name);
    closeCollectionsMenu();
    onCollectionSwitch?.();

    if (isManagementCollection(collection)) {
      const href =
        firstTabInCollection(vaultId, collection) ?? `/${ADMIN_HOME}`;
      navigate(href);
      return;
    }

    if (isAdminRoute || showManagementTabs) {
      const href = firstTabInCollection(vaultId, collection);
      if (href) {
        navigate(href);
      } else {
        navigate(`/`);
      }
    }
  }

  if (error) {
    return (
      <Alert type="error" title={error} showIcon className="tab-nav tab-nav--error" role="alert" />
    );
  }
  if (!nav) {
    return (
      <div className="tab-nav tab-nav--loading">
        <Spin description={displayText(shell.loading_nav)} />
      </div>
    );
  }

  return (
    <nav className="tab-nav" aria-label={displayText(shell.tab_nav_aria)}>
      <Dropdown
        open={collectionsOpen}
        onOpenChange={setCollectionsOpen}
        trigger={["click"]}
        placement="bottomLeft"
        popupRender={() => (
          <div className="dropdown__panel tab-nav__collections-panel" role="menu">
            {collections.map((collection) => {
              const kind = collectionKind(collection);
              const active = collection.api_name === activeCollection?.api_name;
              return (
                <Button
                  key={collection.api_name}
                  type="text"
                  role="menuitem"
                  className={`tab-nav__collection-item${active ? " tab-nav__collection-item--active" : ""}`}
                  onClick={() => selectCollection(collection)}
                >
                  <CollectionIcon kind={kind} />
                  <span>{displayText(collection.label, collection.api_name)}</span>
                </Button>
              );
            })}
          </div>
        )}
      >
        <Button
          type="text"
          className="tab-nav__collections-trigger"
          aria-label={displayText(shell.tab_collections_aria)}
          title={displayText(shell.tab_collections_aria)}
        >
          <span className="tab-nav__grid-icon" aria-hidden="true" />
        </Button>
      </Dropdown>

      <div className="tab-nav__scroll" ref={containerRef}>
        <div className="tab-nav__measure" ref={measureRowRef} aria-hidden="true">
          {showManagementTabs && activeCollection && (
            <div className="tab-nav__measure-prefix" ref={prefixMeasureRef}>
              <CollectionLabelTab
                vaultId={vaultId}
                collection={activeCollection}
                entries={entries}
                activeTab={activeTab}
                activePageApiName={activePageApiName}
                pathname={location.pathname}
              />
            </div>
          )}
          {entries.map((entry, index) => (
            <div
              key={
                entry.kind === "tab"
                  ? `measure-${entry.tab.api_name}`
                  : `measure-${displayText(entry.label)}-${index}`
              }
              className="tab-nav__measure-item"
            >
              <NavEntryItem
                vaultId={vaultId}
                entry={entry}
                activeTab={activeTab}
                activePageApiName={activePageApiName}
                pathname={location.pathname}
                flattenSubtabs={showManagementTabs}
              />
            </div>
          ))}
          <TabOverflowTrigger
            moreAriaLabel={moreAriaLabel}
            tabIndex={-1}
            measure
            ref={moreMeasureRef}
          />
        </div>

        <div className="tab-nav__items">
          {showManagementTabs && activeCollection && (
            <CollectionLabelTab
              vaultId={vaultId}
              collection={activeCollection}
              entries={entries}
              activeTab={activeTab}
              activePageApiName={activePageApiName}
              pathname={location.pathname}
            />
          )}

          {visibleEntries.map((entry, index) => (
            <NavEntryItem
              key={
                entry.kind === "tab"
                  ? entry.tab.api_name
                  : `${displayText(entry.label)}-${index}`
              }
              vaultId={vaultId}
              entry={entry}
              activeTab={activeTab}
              activePageApiName={activePageApiName}
              pathname={location.pathname}
              onNavigate={closeCollectionsMenu}
              flattenSubtabs={showManagementTabs}
            />
          ))}
        </div>

        {overflowCount > 0 && (
          <TabOverflowMenu
            vaultId={vaultId}
            entries={overflowEntries}
            moreAriaLabel={moreAriaLabel}
            activeTab={activeTab}
            activePageApiName={activePageApiName}
            pathname={location.pathname}
            onNavigate={closeCollectionsMenu}
            flattenSubtabs={showManagementTabs}
          />
        )}
      </div>

      <div className="tab-nav__actions">
        {isHomeTab && vaultCreateMenu.allowed && (
          <VaultCreateButton
            pinned={vaultCreateMenu.pinned}
            recent={vaultCreateMenu.recent}
            loading={vaultCreateLoading}
            className="tab-nav__create"
          />
        )}
        {createActions.allowed && createTabApiName && createActions.objectApiName && (
          <ListCreateButton
            vaultId={vaultId}
            tabApiName={createTabApiName}
            objectApiName={createActions.objectApiName}
            objectLabel={createActions.objectLabel}
            allowed={createActions.allowed}
            requiresTypeSelection={createActions.requiresTypeSelection}
            objectTypes={createActions.objectTypes}
            defaultObjectType={createActions.defaultObjectType}
            listRouting={createActions.listRouting}
            className="tab-nav__create"
          />
        )}
      </div>
    </nav>
  );
}
