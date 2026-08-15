import { useOptionalNavigationContext } from "../context/NavigationContext";
import { displayText } from "./i18n";
import { findTabInNav } from "./navObjects";

const TAB_LABEL_FALLBACKS: Record<string, string> = {
  studies__c: "Studies",
  study_countries__c: "Study Countries",
  study_sites__c: "Study Sites",
  subjects__c: "Subjects",
  library__v: "Library",
};

function fallbackTabLabel(tabApiName: string): string {
  return (
    TAB_LABEL_FALLBACKS[tabApiName] ??
    tabApiName
      .replace(/__[cv]$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

/**
 * Resolves the current tab's display label for a record-page breadcrumb.
 *
 * Precedence: an explicit label carried in router navigation state (set when
 * navigating from a list page) wins; otherwise look the tab up in the loaded
 * NavigationModel and use its localized label; finally fall back to a readable
 * label derived from the tab API name.
 *
 * Always returns a string|undefined — never a raw DisplayText — so it remains a
 * valid breadcrumb label.
 */
export function useTabLabel(tabApiName?: string, navStateLabel?: string): string | undefined {
  const nav = useOptionalNavigationContext()?.nav;
  if (navStateLabel) return navStateLabel;
  if (tabApiName && nav) {
    const tab = findTabInNav(nav, tabApiName);
    if (tab) return displayText(tab.label, tabApiName);
  }
  if (tabApiName) return fallbackTabLabel(tabApiName);
  return undefined;
}
