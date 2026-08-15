import { createContext, useContext, type ReactNode } from "react";
import type { NavigationModel } from "../api/types";
import { useNavigation } from "../hooks/useNavigation";

type NavigationContextValue = {
  nav: NavigationModel | null;
  error: string | null;
  refetch: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  vaultId,
  children,
}: {
  vaultId: string | undefined;
  children: ReactNode;
}) {
  const { nav, error, refetch } = useNavigation(vaultId);
  return (
    <NavigationContext.Provider value={{ nav, error, refetch }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigationContext must be used within NavigationProvider");
  }
  return ctx;
}

/** Optional hook for components that may render outside NavigationProvider. */
export function useOptionalNavigationContext(): NavigationContextValue | null {
  return useContext(NavigationContext);
}
