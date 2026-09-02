import type { NavTab } from "../api/types";
import { primaryNavTab } from "./navTabUtils";

/** Resolves SPA href for a navigation Tab (object / page / platform / vault AI kind). */
export function tabHref(_vaultId: string, tab: NavTab): string {
  const target = primaryNavTab(tab);
  if (target.kind === "task_dashboard" || target.api_name === "home__v") {
    return "/";
  }
  if (target.kind === "vault_ai" || target.api_name === "vault_ai__sys") {
    return target.route?.startsWith("/") ? target.route : "/vault-ai";
  }
  if (target.kind === "platform") {
    const route = target.route?.startsWith("/") ? target.route : `/${target.route ?? ""}`;
    return route;
  }
  if (target.kind === "page" && target.page_api_name) {
    return `/pages/${encodeURIComponent(target.page_api_name)}`;
  }
  if (target.kind === "object") {
    return `/tabs/${encodeURIComponent(target.api_name)}`;
  }
  const route = target.route?.startsWith("/") ? target.route : `/tabs/${target.api_name}`;
  return route;
}
