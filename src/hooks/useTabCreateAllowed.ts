import { useTabListActions } from "./useTabListActions";

/** Resolves whether the current object tab allows record creation (CAP-UI object list actions). */
export function useTabCreateAllowed(
  vaultId: string | undefined,
  tabApiName: string | undefined,
  enabled: boolean,
) {
  const actions = useTabListActions(vaultId, tabApiName, enabled);
  return actions.allowed;
}
