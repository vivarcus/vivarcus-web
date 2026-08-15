import { useAuth } from "../auth/AuthProvider";

/** Selected vault id from session (vault context is not in the URL). */
export function useVaultId(): string {
  const { session } = useAuth();
  const vaultId = session?.selectedVaultId;
  if (!vaultId) {
    throw new Error("useVaultId requires a selected vault");
  }
  return vaultId;
}
