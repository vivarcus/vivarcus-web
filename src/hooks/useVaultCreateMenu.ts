import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { VaultCreateMenuModel } from "../api/types";

const emptyMenu: VaultCreateMenuModel = {
  model_type: "vault_create_menu",
  vault_id: "",
  allowed: false,
  pinned: [],
  recent: [],
};

function normalizeVaultCreateMenu(model: VaultCreateMenuModel): VaultCreateMenuModel {
  const legacyItems = (model as VaultCreateMenuModel & { items?: VaultCreateMenuModel["pinned"] }).items;
  return {
    ...model,
    pinned: model.pinned ?? legacyItems ?? [],
    recent: model.recent ?? [],
    allowed:
      model.allowed ??
      Boolean((model.pinned ?? legacyItems ?? []).length || (model.recent ?? []).length),
  };
}

export function useVaultCreateMenu(vaultId: string | undefined, enabled: boolean) {
  const [menu, setMenu] = useState<VaultCreateMenuModel>(emptyMenu);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !vaultId) {
      setMenu(emptyMenu);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .vaultCreateMenu(vaultId)
      .then((model) => {
        if (!cancelled) setMenu(normalizeVaultCreateMenu(model));
      })
      .catch(() => {
        if (!cancelled) setMenu(emptyMenu);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, enabled]);

  return { menu, loading };
}
