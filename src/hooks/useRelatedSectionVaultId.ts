import { useEffect, useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { parseSectionContextVaultId, resolveRelatedSectionVaultId } from "../lib/relatedCreate";
import { useVaultId } from "./useVaultId";

/**
 * Vault id for related-section flows: prefers the signed section token's vault_id
 * (required for gateway routing and backend section-context checks), then syncs
 * session selection when the token vault is in the user's vault list.
 */
export function useRelatedSectionVaultId(sectionContextToken?: string): string {
  const sessionVaultId = useVaultId();
  const { session, selectVault } = useAuth();
  const effectiveVaultId = useMemo(
    () =>
      sectionContextToken
        ? resolveRelatedSectionVaultId(sectionContextToken, sessionVaultId)
        : sessionVaultId,
    [sectionContextToken, sessionVaultId],
  );

  useEffect(() => {
    if (!sectionContextToken) {
      return;
    }
    const tokenVaultId = parseSectionContextVaultId(sectionContextToken);
    if (!tokenVaultId || tokenVaultId === sessionVaultId) {
      return;
    }
    if (session?.vaults.some((v) => v.vault_id === tokenVaultId)) {
      selectVault(tokenVaultId);
    }
  }, [sectionContextToken, sessionVaultId, session?.vaults, selectVault]);

  return effectiveVaultId;
}
