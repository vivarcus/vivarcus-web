import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  pendingChatConversationId: string | null;
  requestOpenChatConversation: (conversationId: string) => void;
  takePendingChatConversationId: () => string | null;
};

const VaultAIContext = createContext<VaultAIContextValue | null>(null);

export function VaultAIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageNavigator, setPageNavigatorState] = useState<VaultAIPageNavigator | null>(null);
  const [pendingChatConversationId, setPendingChatConversationId] = useState<string | null>(null);
  const pendingChatConversationIdRef = useRef<string | null>(null);

  // useState treats a function argument as an updater. Wrap so callers can store a navigator fn.
  const setPageNavigator = useCallback((fn: VaultAIPageNavigator | null) => {
    setPageNavigatorState(() => fn);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const requestOpenChatConversation = useCallback((conversationId: string) => {
    const id = conversationId.trim();
    pendingChatConversationIdRef.current = id || null;
    setPendingChatConversationId(id || null);
  }, []);

  const takePendingChatConversationId = useCallback(() => {
    const id = pendingChatConversationIdRef.current;
    pendingChatConversationIdRef.current = null;
    setPendingChatConversationId(null);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      pageNavigator,
      setPageNavigator,
      pendingChatConversationId,
      requestOpenChatConversation,
      takePendingChatConversationId,
    }),
    [
      open,
      toggle,
      pageNavigator,
      setPageNavigator,
      pendingChatConversationId,
      requestOpenChatConversation,
      takePendingChatConversationId,
    ],
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
