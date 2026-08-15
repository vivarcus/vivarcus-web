import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { DisplayText, ListRouting, ObjectTypeOption } from "../api/types";
import { buildListCreateHref as buildListCreateHrefFromRouting } from "../lib/listRouting";

export type TabListActions = {
  allowed: boolean;
  requiresTypeSelection: boolean;
  objectTypes: ObjectTypeOption[];
  objectApiName?: string;
  objectLabel?: DisplayText;
  defaultObjectType?: string;
  listRouting?: ListRouting | null;
};

const emptyActions: TabListActions = {
  allowed: false,
  requiresTypeSelection: false,
  objectTypes: [],
};

export function useTabListActions(
  vaultId: string | undefined,
  tabApiName: string | undefined,
  enabled: boolean,
) {
  const [actions, setActions] = useState<TabListActions>(emptyActions);

  useEffect(() => {
    if (!enabled || !vaultId || !tabApiName) {
      setActions(emptyActions);
      return;
    }
    let cancelled = false;
    api
      .objectList(vaultId, tabApiName, { view: "all", pageSize: 1 })
      .then((model) => {
        if (cancelled) return;
        setActions({
          allowed: model.actions.allowed,
          requiresTypeSelection: model.actions.requires_type_selection ?? false,
          objectTypes: model.actions.object_types ?? [],
          objectApiName: model.object_api_name,
          objectLabel: model.actions.object_label,
          defaultObjectType: model.actions.default_object_type,
          listRouting: model.list_routing ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setActions(emptyActions);
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, tabApiName, enabled]);

  return actions;
}

export function buildCreateHref(
  _vaultId: string,
  objectApiName: string,
  tabApiName: string,
  objectType?: string,
  listRouting?: ListRouting | null,
) {
  void _vaultId;
  return buildListCreateHrefFromRouting(objectApiName, tabApiName, objectType, listRouting);
}
