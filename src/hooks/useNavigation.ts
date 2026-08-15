import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { NavigationModel } from "../api/types";

export function useNavigation(vaultId: string | undefined) {
  const [nav, setNav] = useState<NavigationModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!vaultId) return;
    let cancelled = false;
    setError(null);
    api.navigation(vaultId)
      .then((model) => {
        if (!cancelled) setNav(model);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, reloadKey]);

  return { nav, error, refetch };
}
