import type { ShellChrome } from "../lib/i18n";
import { displayText } from "../lib/i18n";

export function adminLinks(shell: ShellChrome) {
  return [
    { to: "admin/audit-logs", label: displayText(shell.admin_logs), end: false as const },
    { to: "admin/configuration", label: displayText(shell.admin_configuration), end: false as const },
    { to: "admin/configuration/config-diagnostics", label: displayText(shell.admin_config_diagnostics), end: false as const },
    { to: "admin/settings/language-region", label: displayText(shell.admin_language_region_settings), end: false as const },
    { to: "admin/settings/security", label: displayText(shell.admin_security_settings), end: false as const },
    { to: "admin/settings/branding", label: displayText(shell.admin_branding_settings), end: false as const },
    { to: "admin/settings/search", label: displayText(shell.admin_search_settings), end: false as const },
    { to: "admin/settings/domain", label: displayText(shell.admin_domain_settings), end: false as const },
    { to: "admin/layout-profiles", label: displayText(shell.admin_layout_profile), end: true as const },
    { to: "admin/layout-preview", label: displayText(shell.admin_layout_preview), end: true as const },
  ];
}

export const ADMIN_HOME = "admin/audit-logs/system";
