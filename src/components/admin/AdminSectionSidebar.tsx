import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
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
  type DomainSettingsCategoryKey,
  type DomainSettingsCategoryNavItem,
} from "../../lib/adminSettingsNav";
import { useUi } from "../../context/UiContext";
import { displayText } from "../../lib/i18n";
import { tabHref } from "../../lib/tabHref";
import { saveLastTab } from "../../lib/vaultNav";
import { api } from "../../api/client";
import type { DisplayText, DomainSettingsPageChrome, NavTab } from "../../api/types";

/** Backend-resolved domain settings labels, keyed by sidebar category. */
const DOMAIN_CATEGORY_CHROME_KEY: Record<DomainSettingsCategoryKey, keyof DomainSettingsPageChrome> = {
  general: "general_label",
  features: "features_label",
  "security-policies": "security_policies_label",
  "network-access": "network_access_label",
  "saml-profiles": "saml_profiles_label",
  "oauth-profiles": "oauth_profiles_label",
};

/** Loads the domain settings page chrome once so static sidebar labels resolve per vault language. */
function useDomainSettingsChrome(vaultId: string, enabled: boolean): DomainSettingsPageChrome | null {
  const [chrome, setChrome] = useState<DomainSettingsPageChrome | null>(null);
  useEffect(() => {
    if (!enabled || !vaultId) {
      return;
    }
    let cancelled = false;
    api
      .domainSettings(vaultId)
      .then((model) => {
        if (!cancelled) {
          setChrome(model.chrome);
        }
      })
      .catch(() => {
        // Keep static fallback labels when the page chrome is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, enabled]);
  return chrome;
}

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
  label,
  pathname,
  search,
}: {
  item: DomainSettingsCategoryNavItem;
  label: DisplayText;
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
      <span className="view-tab__label">{displayText(label)}</span>
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
  const domainChrome = useDomainSettingsChrome(
    vaultId,
    Boolean(settingsGroups?.some((group) => (group.domainCategories?.length ?? 0) > 0)),
  );
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
                  label={
                    domainChrome && domainChrome[DOMAIN_CATEGORY_CHROME_KEY[item.key]]
                      ? domainChrome[DOMAIN_CATEGORY_CHROME_KEY[item.key]]
                      : item.label
                  }
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
