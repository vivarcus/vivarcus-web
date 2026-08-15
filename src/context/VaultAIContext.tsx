import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type VaultAIPageNavigator = (page: number, query?: string) => void;

type VaultAIContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageNavigator: VaultAIPageNavigator | null;
  setPageNavigator: (fn: VaultAIPageNavigator | null) => void;
};

const VaultAIContext = createContext<VaultAIContextValue | null>(null);

export function VaultAIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageNavigator, setPageNavigatorState] = useState<VaultAIPageNavigator | null>(null);

  // useState treats a function argument as an updater. Wrap so callers can store a navigator fn.
  const setPageNavigator = useCallback((fn: VaultAIPageNavigator | null) => {
    setPageNavigatorState(() => fn);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, toggle, pageNavigator, setPageNavigator }),
    [open, toggle, pageNavigator, setPageNavigator],
  );

  return <VaultAIContext.Provider value={value}>{children}</VaultAIContext.Provider>;
}

export function useVaultAI() {
  const ctx = useContext(VaultAIContext);
  if (!ctx) {
    throw new Error("useVaultAI requires VaultAIProvider");
  }
  return ctx;
}
