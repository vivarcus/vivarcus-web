import type { DisplayText, ListRouting, ObjectTypeOption } from "../api/types";
import { useOptionalPublishedTabListActions } from "../context/TabListActionsContext";
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

/**
 * Create-button actions for the active object tab.
 *
 * Prefer the ObjectListPage-published snapshot (same records response) so TabNav
 * does not issue a redundant page_size=1 list compose on every tab switch.
 */
export function useTabListActions(
  _vaultId: string | undefined,
  tabApiName: string | undefined,
  enabled: boolean,
) {
  const published = useOptionalPublishedTabListActions();
  if (!enabled || !tabApiName) {
    return emptyActions;
  }
  if (published?.tabApiName === tabApiName) {
    return published.actions;
  }
  return emptyActions;
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

export function tabListActionsFromObjectList(model: {
  object_api_name: string;
  actions: {
    allowed: boolean;
    requires_type_selection?: boolean;
    object_types?: ObjectTypeOption[];
    default_object_type?: string;
    object_label?: DisplayText;
  };
  list_routing?: ListRouting | null;
}): TabListActions {
  return {
    allowed: model.actions.allowed,
    requiresTypeSelection: model.actions.requires_type_selection ?? false,
    objectTypes: model.actions.object_types ?? [],
    objectApiName: model.object_api_name,
    objectLabel: model.actions.object_label,
    defaultObjectType: model.actions.default_object_type,
    listRouting: model.list_routing ?? null,
  };
}
