import { ADMIN_GROUPS_TAB } from "./adminGroups";
import { ADMIN_VAULT_USERS_TAB } from "./adminVaultUsers";

const ADMIN_OBJECT_LIST_ROUTES: Record<string, string> = {
  [ADMIN_VAULT_USERS_TAB]: "/admin/users-groups/vault_users",
  [ADMIN_GROUPS_TAB]: "/admin/users-groups/groups",
};

/** Resolves list back-link for Admin object lists (Vault Users, Groups). */
export function recordListHref(tabApiName: string | undefined): string {
  if (tabApiName) {
    const adminHref = ADMIN_OBJECT_LIST_ROUTES[tabApiName];
    if (adminHref) {
      return adminHref;
    }
    return `/tabs/${encodeURIComponent(tabApiName)}`;
  }
  return "/";
}
