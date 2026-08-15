import { Link, useSearchParams } from "react-router-dom";
import type { AdminSectionNav } from "../../lib/adminSectionNav";
import { isAdminSubtabActive } from "../../lib/adminSectionNav";
import {
  buildDeploymentSidebarGroups,
  isAdminDeploymentSection,
} from "../../lib/adminDeploymentNav";
import {
  buildOperationsSidebarGroups,
  isAdminOperationsSection,
} from "../../lib/adminOperationsNav";
import {
  buildSettingsSidebarGroups,
  isAdminSettingsSection,
  isDomainSettingsCategoryActive,
  type DomainSettingsCategoryNavItem,
} from "../../lib/adminSettingsNav";
import { useUi } from "../../context/UiContext";
import { displayText } from "../../lib/i18n";
import { tabHref } from "../../lib/tabHref";
import { saveLastTab } from "../../lib/vaultNav";
import type { NavTab } from "../../api/types";

function SectionNavLink({
  vaultId,
  tab,
  pathname,
}: {
  vaultId: string;
  tab: NavTab;
  pathname: string;
}) {
  const active = isAdminSubtabActive(tab, pathname);
  return (
    <Link
      to={tabHref(vaultId, tab)}
      className={`view-tab${active ? " view-tab--active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => saveLastTab(vaultId, tab.api_name)}
    >
      <span className="view-tab__label">{displayText(tab.label, tab.api_name)}</span>
    </Link>
  );
}

function DomainCategoryNavLink({
  item,
  pathname,
  search,
}: {
  item: DomainSettingsCategoryNavItem;
  pathname: string;
  search: string;
}) {
  const active = isDomainSettingsCategoryActive(item, pathname, search);
  return (
    <Link
      to={item.route}
      className={`view-tab${active ? " view-tab--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="view-tab__label">{displayText(item.label)}</span>
    </Link>
  );
}

export function AdminSectionSidebar({
  vaultId,
  section,
  pathname,
}: {
  vaultId: string;
  section: AdminSectionNav;
  pathname: string;
}) {
  const { shell } = useUi();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const settingsGroups = isAdminSettingsSection(section.parent)
    ? buildSettingsSidebarGroups(
        section.subtabs,
        {
          vault: shell.admin_vault_settings_group,
          domain: shell.admin_domain_settings_group,
        },
        { domainSettingsVisible: section.domainSettingsVisible },
      )
    : null;
  const operationsGroups = isAdminOperationsSection(section.parent)
    ? buildOperationsSidebarGroups(section.subtabs)
    : null;
  const deploymentGroups = isAdminDeploymentSection(section.parent)
    ? buildDeploymentSidebarGroups(section.subtabs)
    : null;

  if (settingsGroups && settingsGroups.length > 0) {
    return (
      <aside className="list-page__sidebar admin-section-sidebar">
        {settingsGroups.map((group) => (
          <section key={group.key} className="sidebar-section">
            <h2 className="sidebar-section__title">{displayText(group.label)}</h2>
            <nav className="view-tabs" aria-label={displayText(group.label)}>
              {group.subtabs.map((tab) => (
                <SectionNavLink key={tab.api_name} vaultId={vaultId} tab={tab} pathname={pathname} />
              ))}
              {(group.domainCategories ?? []).map((item) => (
                <DomainCategoryNavLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  search={search}
                />
              ))}
            </nav>
          </section>
        ))}
      </aside>
    );
  }

  if (operationsGroups && operationsGroups.length > 0) {
    return (
      <aside className="list-page__sidebar admin-section-sidebar">
        {operationsGroups.map((group) => (
          <section key={group.key} className="sidebar-section">
            <h2 className="sidebar-section__title">{displayText(group.label)}</h2>
            <nav className="view-tabs" aria-label={displayText(group.label)}>
              {group.subtabs.map((tab) => (
                <SectionNavLink key={tab.api_name} vaultId={vaultId} tab={tab} pathname={pathname} />
              ))}
            </nav>
          </section>
        ))}
      </aside>
    );
  }

  if (deploymentGroups && deploymentGroups.length > 0) {
    return (
      <aside className="list-page__sidebar admin-section-sidebar">
        {deploymentGroups.map((group) => (
          <section key={group.key} className="sidebar-section">
            <h2 className="sidebar-section__title">{displayText(group.label)}</h2>
            <nav className="view-tabs" aria-label={displayText(group.label)}>
              {group.subtabs.map((tab) => (
                <SectionNavLink key={tab.api_name} vaultId={vaultId} tab={tab} pathname={pathname} />
              ))}
            </nav>
          </section>
        ))}
      </aside>
    );
  }

  return (
    <aside className="list-page__sidebar admin-section-sidebar">
      <section className="sidebar-section">
        <h2 className="sidebar-section__title">
          {displayText(section.parent.label, section.parent.api_name)}
        </h2>
        <nav className="view-tabs" aria-label={displayText(section.parent.label, section.parent.api_name)}>
          {section.subtabs.map((tab) => (
            <SectionNavLink key={tab.api_name} vaultId={vaultId} tab={tab} pathname={pathname} />
          ))}
        </nav>
      </section>
    </aside>
  );
}
