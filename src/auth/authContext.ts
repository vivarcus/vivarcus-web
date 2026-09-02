import { createContext, useContext } from "react";
import type { DisplayContext, VaultRef } from "../api/types";
import type { AuthChrome } from "../lib/i18n";
import type { SessionState } from "./session";

/**
 * Auth context lives in its own module so Vite HMR can refresh AuthProvider
 * without recreating the Context object (which would desync Provider vs consumers).
 */
export type AuthContextValue = {
  session: SessionState | null;
  authChrome: AuthChrome;
  authDisplayContext: DisplayContext;
  login: (username: string, password: string) => Promise<string | null>;
  completeOAuthSession: (sessionToken: string) => Promise<string | null>;
  logout: () => Promise<void>;
  selectVault: (vaultId: string, landing?: string) => void | Promise<void>;
  clearVaultSelection: () => void;
  refreshVaults: () => Promise<void>;
  selectedVault: VaultRef | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
