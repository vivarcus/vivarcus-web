import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TabListActions } from "../hooks/useTabListActions";

type PublishedTabListActions = {
  tabApiName: string;
  actions: TabListActions;
};

type TabListActionsContextValue = {
  published: PublishedTabListActions | null;
  publish: (tabApiName: string, actions: TabListActions) => void;
  clear: (tabApiName: string) => void;
};

const TabListActionsContext = createContext<TabListActionsContextValue | null>(null);

const noopPublisher: Pick<TabListActionsContextValue, "publish" | "clear"> = {
  publish: () => undefined,
  clear: () => undefined,
};

export function TabListActionsProvider({ children }: { children: ReactNode }) {
  const [published, setPublished] = useState<PublishedTabListActions | null>(null);

  const publish = useCallback((tabApiName: string, actions: TabListActions) => {
    setPublished({ tabApiName, actions });
  }, []);

  const clear = useCallback((tabApiName: string) => {
    setPublished((prev) => (prev?.tabApiName === tabApiName ? null : prev));
  }, []);

  const value = useMemo(
    () => ({ published, publish, clear }),
    [published, publish, clear],
  );

  return (
    <TabListActionsContext.Provider value={value}>{children}</TabListActionsContext.Provider>
  );
}

/**
 * Publishes list Create actions to TabNav; no-ops outside TabListActionsProvider.
 *
 * Returns a stable `{ publish, clear }` — must not expose `published`, or any
 * ObjectListPage effect that depends on this object will loop: publish →
 * published changes → new context value → effect cleanup clear → publish…
 */
export function useTabListActionsPublisher(): Pick<
  TabListActionsContextValue,
  "publish" | "clear"
> {
  const ctx = useContext(TabListActionsContext);
  const publish = ctx?.publish ?? noopPublisher.publish;
  const clear = ctx?.clear ?? noopPublisher.clear;
  return useMemo(() => ({ publish, clear }), [publish, clear]);
}

/** Optional: TabNav Create button reads actions published by ObjectListPage. */
export function useOptionalPublishedTabListActions(): PublishedTabListActions | null {
  return useContext(TabListActionsContext)?.published ?? null;
}
