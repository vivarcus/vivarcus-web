import {
  Button,
  Checkbox,
  Drawer,
  Flex,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Typography,
  message as antMessage,
} from "antd";
import {
  CloseOutlined,
  CompressOutlined,
  DownloadOutlined,
  ExpandOutlined,
  FormOutlined,
  HistoryOutlined,
  PushpinFilled,
  PushpinOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import { api, HttpError } from "../api/client";
import { useUi } from "../context/UiContext";
import { useVaultAI } from "../context/VaultAIContext";
import { defaultVaultAIChrome, displayText, displayTextTemplate } from "../lib/i18n";
import { parseVaultAIPageHref, prepareVaultAIAssistantMarkdown } from "../lib/vaultAIPageLinks";
import {
  type VaultAIChatFloatRect,
  type VaultAIChatFloatResizeEdge,
  type VaultAIChatView,
  VAULT_AI_CHAT_DOCKED_CLASS,
  VAULT_AI_CHAT_DOCK_WIDTH_VAR,
  VAULT_AI_CHAT_PANEL_WIDTH,
  clampFloatRect,
  defaultFloatRect,
  loadVaultAIChatViewPrefs,
  resizeFloatRect,
  saveVaultAIChatViewPrefs,
} from "../lib/vaultAIChatView";
import { VaultAIThinkingIndicator, vaultAIThinkingLabel } from "./VaultAIThinkingIndicator";
import "../styles/components/vault-ai-chat.css";

type ActionItem = {
  agent_name: string;
  agent_label: string;
  name: string;
  label: string;
  description?: string;
};

type AskUserPrompt = {
  question: string;
  style: string;
  options?: string[];
  allow_other?: boolean;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  action_name?: string;
  agent_name?: string;
  status?: string;
  ask_user?: AskUserPrompt;
};

type Conversation = {
  id: string;
  title: string;
  object_name: string;
  record_id: string;
  last_message_at: string;
  trace_status?: string;
  trace_action_count?: number;
};

type Props = {
  open: boolean;
  vaultId: string;
  objectName?: string;
  recordId?: string;
  onClose: () => void;
  /** Jump the document viewer to a 1-based page (document records). */
  onNavigateToPage?: (page: number, query?: string) => void;
};

function VaultAITitleIcon() {
  return (
    <span className="vault-ai-chat__title-icon" aria-hidden>
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          fill="currentColor"
          d="M8 0.6 9.35 6.05 14.9 7.4 9.35 8.75 8 14.3 6.65 8.75 1.1 7.4 6.65 6.05Z"
        />
      </svg>
    </span>
  );
}

export function VaultAIChatPanel({
  open,
  vaultId,
  objectName,
  recordId,
  onClose,
  onNavigateToPage,
}: Props) {
  const { takePendingChatConversationId } = useVaultAI();
  const { shell } = useUi();
  const chrome = useMemo(
    () => ({ ...defaultVaultAIChrome, ...shell.vault_ai }),
    [shell.vault_ai],
  );
  const hasRecordContext = Boolean(objectName && recordId);
  const [view, setView] = useState<VaultAIChatView>(() => loadVaultAIChatViewPrefs().view);
  const [floatRect, setFloatRect] = useState<VaultAIChatFloatRect>(
    () => loadVaultAIChatViewPrefs().float ?? defaultFloatRect(),
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [promptedActions, setPromptedActions] = useState<ActionItem[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thinkingStage, setThinkingStage] = useState("thinking");
  const [traceStatus, setTraceStatus] = useState("");
  const [traceActionCount, setTraceActionCount] = useState(0);
  const [autoSwitchConversation, setAutoSwitchConversation] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recentChatsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const returnViewRef = useRef<"panel" | "float">("panel");
  const floatDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const floatResizeRef = useRef<{
    pointerId: number;
    edge: VaultAIChatFloatResizeEdge;
    originX: number;
    originY: number;
    start: VaultAIChatFloatRect;
  } | null>(null);
  conversationIdRef.current = conversationId;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const refreshConversations = useCallback(
    async (scoped: boolean) => {
      const res = scoped
        ? await api.vaultAIChatListConversations(vaultId, objectName, recordId)
        : await api.vaultAIChatListConversations(vaultId);
      setConversations(res.items ?? []);
      return res.items ?? [];
    },
    [vaultId, objectName, recordId],
  );

  const openConversation = useCallback(
    async (id: string) => {
      const res = await api.vaultAIChatGetConversation(vaultId, id);
      setConversationId(res.conversation.id);
      setTraceStatus(res.conversation.trace_status ?? "");
      setTraceActionCount(res.conversation.trace_action_count ?? 0);
      setMessages(
        (res.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          action_name: m.action_name,
          agent_name: m.agent_name,
          status: m.status,
          ask_user:
            m.status === "pending" && m.token_usage?.ask_user
              ? m.token_usage.ask_user
              : undefined,
        })),
      );
      setStreamingContent("");
      setThinking(false);
    },
    [vaultId],
  );

  const bootstrap = useCallback(async () => {
    if (!objectName || !recordId) {
      setLoading(false);
      setError(null);
      setActions([]);
      setPromptedActions(null);
      setConversations([]);
      setConversationId(null);
      setMessages([]);
      setStreamingContent("");
      setThinking(false);
      setDraft("");
      setTraceStatus("");
      setTraceActionCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.vaultAIChatActions(vaultId, objectName, recordId);
      setActions(res.actions ?? []);
      const autoSwitch = res.availability?.auto_switch_conversation !== false;
      setAutoSwitchConversation(autoSwitch);
      if (!res.availability?.enabled) {
        setError(
          res.availability?.reason
            ? displayTextTemplate(chrome.unavailable_with_reason, { reason: res.availability.reason })
            : displayText(chrome.unavailable),
        );
        return;
      }
      const pendingId = takePendingChatConversationId();
      // Keep current chat when auto-switch is off, unless History asked for a specific thread.
      if (!pendingId && !autoSwitch && conversationIdRef.current) {
        const items = await refreshConversations(false);
        setConversations(items);
        return;
      }
      setMessages([]);
      setConversationId(null);
      setStreamingContent("");
      setThinking(false);
      setDraft("");
      const items = await refreshConversations(autoSwitch);
      if (pendingId) {
        try {
          await openConversation(pendingId);
          return;
        } catch {
          // Fall through to the latest thread for this record.
        }
      }
      if (items.length > 0) {
        await openConversation(items[0].id);
      } else {
        const created = await api.vaultAIChatCreateConversation(vaultId, {
          object: objectName,
          record_id: recordId,
        });
        setConversationId(created.id);
        setMessages([]);
        setTraceStatus("");
        setTraceActionCount(0);
        await refreshConversations(autoSwitch);
      }
    } catch (e) {
      setError(e instanceof HttpError ? e.message : e instanceof Error ? e.message : "Failed to open chat");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [
    vaultId,
    objectName,
    recordId,
    chrome.unavailable,
    chrome.unavailable_with_reason,
    refreshConversations,
    openConversation,
    takePendingChatConversationId,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (open) {
      const prefs = loadVaultAIChatViewPrefs();
      setView(prefs.view);
      setFloatRect(prefs.float ?? defaultFloatRect());
      if (prefs.view === "panel" || prefs.view === "float") {
        returnViewRef.current = prefs.view;
      }
      setShowHistory(false);
      void bootstrap();
    }
  }, [open, objectName, recordId, vaultId]); // eslint-disable-line react-hooks/exhaustive-deps -- re-bootstrap on context change

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, thinking, scrollToBottom]);

  useEffect(() => {
    if (!open || view !== "float") return;
    function onResize() {
      setFloatRect((prev) => clampFloatRect(prev));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, view]);

  // Docked Panel pushes TabNav + record detail left; Float overlays instead.
  useEffect(() => {
    const root = document.documentElement;
    const docked = open && view === "panel";
    if (docked) {
      root.classList.add(VAULT_AI_CHAT_DOCKED_CLASS);
      root.style.setProperty(VAULT_AI_CHAT_DOCK_WIDTH_VAR, `${VAULT_AI_CHAT_PANEL_WIDTH}px`);
    } else {
      root.classList.remove(VAULT_AI_CHAT_DOCKED_CLASS);
      root.style.removeProperty(VAULT_AI_CHAT_DOCK_WIDTH_VAR);
    }
    return () => {
      root.classList.remove(VAULT_AI_CHAT_DOCKED_CLASS);
      root.style.removeProperty(VAULT_AI_CHAT_DOCK_WIDTH_VAR);
    };
  }, [open, view]);

  async function newChat() {
    if (!objectName || !recordId) return;
    try {
      setShowHistory(false);
      const created = await api.vaultAIChatCreateConversation(vaultId, {
        object: objectName,
        record_id: recordId,
      });
      setConversationId(created.id);
      setMessages([]);
      setStreamingContent("");
      setThinking(false);
      setDraft("");
      setPromptedActions(null);
      setTraceStatus("");
      setTraceActionCount(0);
      await refreshConversations(autoSwitchConversation);
    } catch (e) {
      antMessage.error(e instanceof Error ? e.message : "Failed to create chat");
    }
  }

  async function toggleTrace(enabled: boolean) {
    if (!conversationId) return;
    try {
      const c = await api.vaultAIChatSetTrace(vaultId, conversationId, enabled);
      setTraceStatus(c.trace_status ?? (enabled ? "active" : ""));
      setTraceActionCount(c.trace_action_count ?? 0);
      antMessage.success(enabled ? "Trace started (max 5 actions)" : "Trace stopped");
    } catch (e) {
      antMessage.error(e instanceof Error ? e.message : "Failed to update trace");
    }
  }

  async function downloadTrace() {
    if (!conversationId) return;
    try {
      const doc = await api.vaultAIChatGetTrace(vaultId, conversationId);
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-ai-trace-${conversationId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      antMessage.error(e instanceof Error ? e.message : "Failed to download trace");
    }
  }

  async function send(opts?: { action_name?: string; agent_name?: string; message?: string }) {
    if (!conversationId || sending) return;
    const text = (opts?.message ?? draft).trim();
    const actionName = opts?.action_name;
    if (!text && !actionName) return;

    setSending(true);
    setError(null);
    abortRef.current = false;
    setDraft("");
    setStreamingContent("");
    setThinking(true);
    setThinkingStage("thinking");
    setPromptedActions(null);

    // Optimistic user bubble when there is text
    const tempUserId = `tmp-user-${Date.now()}`;
    if (text) {
      setMessages((prev) => [...prev, { id: tempUserId, role: "user", content: text, status: "complete" }]);
    } else if (actionName) {
      const label =
        actions.find((a) => a.name === actionName)?.label ??
        promptedActions?.find((a) => a.name === actionName)?.label ??
        actionName;
      setMessages((prev) => [...prev, { id: tempUserId, role: "user", content: label, status: "complete" }]);
    }

    try {
      await api.vaultAIChatSendMessageStream(
        vaultId,
        conversationId,
        {
          message: text,
          action_name: actionName,
          agent_name: opts?.agent_name,
        },
        {
          onDelta: (chunk) => {
            if (abortRef.current) return;
            setThinking(false);
            setStreamingContent((prev) => prev + chunk);
          },
          onProgress: (stage) => {
            if (abortRef.current) return;
            setThinkingStage(stage);
          },
          onSelectAction: (payload) => {
            setThinking(false);
            const suggested = (payload.actions ?? []).map((a) => ({
              agent_name: a.agent_name,
              agent_label: a.agent_label,
              name: a.name,
              label: a.label,
              description: a.description,
            }));
            setPromptedActions(suggested.length > 0 ? suggested : null);
            const user = payload.user_message;
            const assistant = payload.assistant_message;
            if (user && assistant) {
              setMessages((prev) => {
                const withoutTemp = prev.filter((m) => m.id !== tempUserId);
                return [
                  ...withoutTemp,
                  {
                    id: user.id,
                    role: user.role,
                    content: user.content,
                    status: user.status,
                  },
                  {
                    id: assistant.id,
                    role: assistant.role,
                    content:
                      assistant.content ||
                      payload.prompt ||
                      displayText(chrome.select_action_prompt),
                    status: assistant.status,
                  },
                ];
              });
            }
            setThinking(false);
            setStreamingContent("");
          },
          onAskUser: (payload) => {
            const user = payload.user_message;
            const assistant = payload.assistant_message;
            if (user && assistant && payload.ask_user) {
              setMessages((prev) => {
                const withoutTemp = prev.filter((m) => m.id !== tempUserId);
                return [
                  ...withoutTemp,
                  {
                    id: user.id,
                    role: user.role,
                    content: user.content,
                    action_name: user.action_name ?? payload.action_name,
                    agent_name: user.agent_name ?? payload.agent_name,
                    status: user.status,
                  },
                  {
                    id: assistant.id,
                    role: assistant.role,
                    content: assistant.content || payload.ask_user.question,
                    action_name: assistant.action_name ?? payload.action_name,
                    agent_name: assistant.agent_name ?? payload.agent_name,
                    status: assistant.status ?? "pending",
                    ask_user: payload.ask_user,
                  },
                ];
              });
            }
            setThinking(false);
            setStreamingContent("");
          },
          onDone: (payload) => {
            const user = payload.user_message;
            const assistant = payload.assistant_message;
            if (payload.select_actions && payload.select_actions.length > 0) {
              setPromptedActions(
                payload.select_actions.map((a) => ({
                  agent_name: a.agent_name,
                  agent_label: a.agent_label,
                  name: a.name,
                  label: a.label,
                  description: a.description,
                })),
              );
            }
            setMessages((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempUserId);
              const askUser = payload.ask_user;
              // select_action / ask_user may have already written messages
              if (withoutTemp.some((m) => m.id === user.id)) {
                return withoutTemp.map((m) =>
                  m.id === assistant.id
                    ? {
                        ...m,
                        content: assistant.content || m.content,
                        status: assistant.status || m.status,
                        action_name: assistant.action_name ?? m.action_name,
                        agent_name: assistant.agent_name ?? m.agent_name,
                        ask_user: askUser ?? m.ask_user,
                      }
                    : m,
                );
              }
              return [
                ...withoutTemp,
                {
                  id: user.id,
                  role: user.role,
                  content: user.content,
                  action_name: user.action_name,
                  agent_name: user.agent_name,
                  status: user.status,
                },
                {
                  id: assistant.id,
                  role: assistant.role,
                  content: assistant.content,
                  action_name: assistant.action_name,
                  agent_name: assistant.agent_name,
                  status: assistant.status,
                  ask_user: askUser,
                },
              ];
            });
            setThinking(false);
            setStreamingContent("");
            void refreshConversations(autoSwitchConversation);
            void api.vaultAIChatGetConversation(vaultId, conversationId).then((res) => {
              setTraceStatus(res.conversation.trace_status ?? "");
              setTraceActionCount(res.conversation.trace_action_count ?? 0);
            });
          },
          onCancelled: (payload) => {
            if (payload.user_message) {
              setMessages((prev) => {
                const withoutTemp = prev.filter((m) => m.id !== tempUserId);
                const next = [
                  ...withoutTemp,
                  {
                    id: payload.user_message!.id,
                    role: payload.user_message!.role,
                    content: payload.user_message!.content,
                    status: payload.user_message!.status,
                  },
                ];
                if (payload.assistant_message?.content) {
                  next.push({
                    id: payload.assistant_message.id,
                    role: "assistant",
                    content: payload.assistant_message.content,
                    status: "cancelled",
                  });
                }
                return next;
              });
            }
            setThinking(false);
            setStreamingContent("");
          },
          onError: (msg) => {
            setError(msg);
            setThinking(false);
            setStreamingContent("");
            setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
          },
        },
      );
    } catch (e) {
      setError(e instanceof HttpError ? e.message : e instanceof Error ? e.message : "Send failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      setStreamingContent("");
      setThinking(false);
    } finally {
      setSending(false);
      setThinking(false);
    }
  }

  async function stop() {
    if (!conversationId) return;
    abortRef.current = true;
    try {
      await api.vaultAIChatCancel(vaultId, conversationId);
    } catch {
      /* ignore */
    }
  }

  function switchView(next: VaultAIChatView) {
    setShowHistory(false);
    if ((view === "panel" || view === "float") && next === "full") {
      returnViewRef.current = view;
    }
    if (next === "panel" || next === "float") {
      returnViewRef.current = next;
    }
    // Undocking: start from the same right-rail geometry as the docked Panel.
    if (next === "float" && view === "panel") {
      const docked = defaultFloatRect();
      setFloatRect(docked);
      setView(next);
      saveVaultAIChatViewPrefs({ view: next, float: docked });
      return;
    }
    setView(next);
    saveVaultAIChatViewPrefs({
      view: next,
      float: next === "float" || view === "float" ? floatRect : loadVaultAIChatViewPrefs().float,
    });
  }

  function persistFloatRect(rect: VaultAIChatFloatRect) {
    const next = clampFloatRect(rect);
    setFloatRect(next);
    saveVaultAIChatViewPrefs({ view: "float", float: next });
  }

  function onFloatHeaderPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, .vault-ai-chat-float__resize")) return;
    floatDragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - floatRect.x,
      offsetY: e.clientY - floatRect.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onFloatHeaderPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const drag = floatDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setFloatRect((prev) =>
      clampFloatRect({
        ...prev,
        x: e.clientX - drag.offsetX,
        y: e.clientY - drag.offsetY,
      }),
    );
  }

  function onFloatHeaderPointerUp(e: ReactPointerEvent<HTMLElement>) {
    const drag = floatDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    floatDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    persistFloatRect({
      ...floatRect,
      x: e.clientX - drag.offsetX,
      y: e.clientY - drag.offsetY,
    });
  }

  function onFloatResizePointerDown(edge: VaultAIChatFloatResizeEdge) {
    return (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      floatResizeRef.current = {
        pointerId: e.pointerId,
        edge,
        originX: e.clientX,
        originY: e.clientY,
        start: floatRect,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
  }

  function onFloatResizePointerMove(e: ReactPointerEvent<HTMLElement>) {
    const resize = floatResizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    setFloatRect(
      resizeFloatRect(
        resize.start,
        resize.edge,
        e.clientX,
        e.clientY,
        resize.originX,
        resize.originY,
      ),
    );
  }

  function onFloatResizePointerUp(e: ReactPointerEvent<HTMLElement>) {
    const resize = floatResizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    floatResizeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    persistFloatRect(
      resizeFloatRect(
        resize.start,
        resize.edge,
        e.clientX,
        e.clientY,
        resize.originX,
        resize.originY,
      ),
    );
  }

  const suggestedActions = promptedActions ?? actions;

  const pendingAskUser = [...messages].reverse().find((m) => m.role === "assistant" && m.ask_user && m.status === "pending");

  async function submitAskUserAnswer(messageId: string, text: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.ask_user || !text.trim()) return;
    // Clear the prompt so it cannot be submitted twice while the next turn streams.
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ask_user: undefined, status: "complete" } : m)),
    );
    await send({
      message: text.trim(),
      action_name: msg.action_name,
      agent_name: msg.agent_name,
    });
  }

  const isEmptyChat =
    !loading && messages.length === 0 && !streamingContent && !thinking && !showHistory;

  const messagesBlock = (
    <div ref={listRef} className="vault-ai-chat__messages">
      {loading ? (
        <Spin />
      ) : showHistory ? (
        <div className="vault-ai-chat__history-panel">
          <h2 className="vault-ai-chat__history-heading">
            {displayText(chrome.history_title)}
          </h2>
          {conversations.length === 0 ? (
            <Typography.Text type="secondary" className="vault-ai-chat__history-empty">
              {displayText(chrome.history_empty)}
            </Typography.Text>
          ) : (
            <div className="vault-ai-chat__history-list">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={[
                    "vault-ai-chat__history-item",
                    c.id === conversationId ? "vault-ai-chat__history-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setShowHistory(false);
                    void openConversation(c.id);
                  }}
                >
                  <span className="vault-ai-chat__history-item-title">
                    {c.title || displayText(chrome.untitled_chat)}
                  </span>
                  {(c.record_id || recordId) && (
                    <span className="vault-ai-chat__history-item-subtitle">
                      {c.record_id || recordId}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : isEmptyChat ? (
        <div className="vault-ai-chat__empty-state">
          <h2 className="vault-ai-chat__empty-title">{displayText(chrome.new_chat)}</h2>
          <div className="vault-ai-chat__help-prompt">
            <VaultAITitleIcon />
            <span>{displayText(chrome.help_prompt)}</span>
          </div>
          {suggestedActions.length > 0 ? (
            <div className="vault-ai-chat__action-cards">
              {suggestedActions.map((a) => (
                <button
                  key={`${a.agent_name}/${a.name}`}
                  type="button"
                  className="vault-ai-chat__action-card"
                  disabled={sending || loading}
                  onClick={() => {
                    setPromptedActions(null);
                    void send({ action_name: a.name, agent_name: a.agent_name });
                  }}
                >
                  <VaultAITitleIcon />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <Typography.Paragraph type="secondary" className="vault-ai-chat__empty">
              {displayText(chrome.empty_hint)}
            </Typography.Paragraph>
          )}
        </div>
      ) : (
        <>
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              status={m.status}
              askUser={m.id === pendingAskUser?.id ? m.ask_user : undefined}
              askUserDisabled={sending}
              onSubmitAskUser={
                m.id === pendingAskUser?.id
                  ? (answer) => void submitAskUserAnswer(m.id, answer)
                  : undefined
              }
              chrome={chrome}
              onNavigateToPage={onNavigateToPage}
            />
          ))}
          {thinking || streamingContent ? (
            <MessageBubble
              role="assistant"
              content={streamingContent}
              thinking={thinking && !streamingContent}
              thinkingLabel={vaultAIThinkingLabel(chrome, thinkingStage)}
              streaming={Boolean(streamingContent)}
              chrome={chrome}
              onNavigateToPage={onNavigateToPage}
            />
          ) : null}
        </>
      )}
    </div>
  );

  const composerBlock = (
    <>
      <div className="vault-ai-chat__composer">
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={displayText(chrome.input_placeholder)}
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={sending || loading || !conversationId || showHistory}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="vault-ai-chat__input"
        />
        {sending ? (
          <Button
            danger
            className="vault-ai-chat__send"
            icon={<StopOutlined />}
            onClick={() => void stop()}
            aria-label={displayText(chrome.stop)}
          />
        ) : (
          <Button
            type="primary"
            className="vault-ai-chat__send"
            icon={<SendOutlined />}
            disabled={loading || !conversationId || showHistory || (!draft.trim() && actions.length === 0)}
            onClick={() => void send()}
          />
        )}
      </div>
      <Typography.Text type="secondary" className="vault-ai-chat__disclaimer">
        {displayText(chrome.disclaimer)}
      </Typography.Text>
    </>
  );

  const panelActionChips =
    (view === "panel" || view === "float") &&
    promptedActions &&
    promptedActions.length > 0 &&
    !isEmptyChat ? (
      <Space size={[6, 6]} wrap className="vault-ai-chat__actions">
        {promptedActions.map((a) => (
          <Button
            key={`${a.agent_name}/${a.name}`}
            size="small"
            type="primary"
            disabled={sending || loading}
            onClick={() => {
              setPromptedActions(null);
              void send({ action_name: a.name, agent_name: a.agent_name });
            }}
          >
            {a.label}
          </Button>
        ))}
      </Space>
    ) : null;

  const panelToolbar =
    (view === "panel" || view === "float") && hasRecordContext ? (
      <div className="vault-ai-chat__toolbar">
        <Button
          type="text"
          size="small"
          icon={<FormOutlined />}
          onClick={() => void newChat()}
          disabled={sending}
          aria-label={displayText(chrome.new_chat)}
          title={displayText(chrome.new_chat)}
        />
        <Button
          type="text"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => {
            setShowHistory((v) => {
              if (!v) void refreshConversations(autoSwitchConversation);
              return !v;
            });
          }}
          disabled={sending}
          aria-label={displayText(chrome.history)}
          title={displayText(chrome.history)}
          className={showHistory ? "vault-ai-chat__toolbar-btn--active" : undefined}
        />
      </div>
    ) : null;

  const chatBody = (
    <div className="vault-ai-chat__body">
      {!hasRecordContext ? (
        <Typography.Paragraph type="secondary" className="vault-ai-chat__empty">
          {displayText(chrome.no_record_context)}
        </Typography.Paragraph>
      ) : (
        <>
          {panelToolbar}
          {error && (
            <Typography.Text type="danger" className="vault-ai-chat__error">
              {error}
            </Typography.Text>
          )}
          {messagesBlock}
          {panelActionChips}
          {composerBlock}
        </>
      )}
    </div>
  );

  const surfaceHeaderActions = (
    <Space size={4} className="vault-ai-chat__header-actions">
      <Button
        size="small"
        type="text"
        icon={<ExpandOutlined />}
        onClick={() => switchView("full")}
        aria-label={displayText(chrome.full_view)}
        title={displayText(chrome.full_view)}
      />
      <Button
        size="small"
        type="text"
        icon={view === "panel" ? <PushpinFilled /> : <PushpinOutlined />}
        onClick={() => switchView(view === "float" ? "panel" : "float")}
        aria-label={displayText(view === "panel" ? chrome.float_view : chrome.pin)}
        title={displayText(view === "panel" ? chrome.float_view : chrome.pin)}
        className={view === "panel" ? "vault-ai-chat__header-btn--pinned" : undefined}
      />
      <Button
        size="small"
        type="text"
        icon={<CloseOutlined />}
        onClick={onClose}
        aria-label={displayText(chrome.close)}
        title={displayText(chrome.close)}
      />
    </Space>
  );

  const titleNode = (
    <div className="vault-ai-chat__title">
      <span>{displayText(chrome.title)}</span>
      <VaultAITitleIcon />
    </div>
  );

  function scrollToRecentChats() {
    recentChatsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (view === "full") {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width="100%"
        centered
        rootClassName="vault-ai-chat-modal"
        styles={{
          container: { padding: 0, height: "100%" },
          content: { padding: 0, height: "100%", boxShadow: "none", borderRadius: 0 },
          body: { padding: 0, height: "100%" },
        }}
        destroyOnHidden
        closable={false}
        title={null}
      >
        <div className="vault-ai-chat-full">
          <aside className="vault-ai-chat-full__sidebar">
            <div className="vault-ai-chat-full__brand">{titleNode}</div>

            <div className="vault-ai-chat-full__sidebar-scroll">
              {hasRecordContext && actions.length > 0 ? (
                <section className="vault-ai-chat-full__section">
                  <div className="vault-ai-chat-full__section-label">
                    {displayText(chrome.actions_section)}
                  </div>
                  <div className="vault-ai-chat-full__action-list">
                    {actions.map((a) => (
                      <button
                        key={`${a.agent_name}/${a.name}`}
                        type="button"
                        className="vault-ai-chat-full__action-item"
                        disabled={sending || loading}
                        onClick={() => {
                          setPromptedActions(null);
                          void send({ action_name: a.name, agent_name: a.agent_name });
                        }}
                      >
                        <VaultAITitleIcon />
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section ref={recentChatsRef} className="vault-ai-chat-full__section">
                <div className="vault-ai-chat-full__section-label">
                  {displayText(chrome.recent_chats)}
                </div>
                <div className="vault-ai-chat-full__chat-list">
                  {conversations.length === 0 ? (
                    <div className="vault-ai-chat-full__chat-empty">
                      {displayText(chrome.untitled_chat)}
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={[
                          "vault-ai-chat-full__chat-item",
                          c.id === conversationId ? "vault-ai-chat-full__chat-item--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => void openConversation(c.id)}
                      >
                        <span className="vault-ai-chat-full__chat-title">
                          {c.title || displayText(chrome.untitled_chat)}
                        </span>
                        {(c.record_id || recordId) && (
                          <span className="vault-ai-chat-full__chat-subtitle">
                            {c.record_id || recordId}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="vault-ai-chat-full__sidebar-footer">
              <button
                type="button"
                className="vault-ai-chat-full__footer-btn"
                disabled={sending || !hasRecordContext}
                onClick={() => void newChat()}
              >
                <FormOutlined />
                <span>{displayText(chrome.new_chat)}</span>
              </button>
              <button
                type="button"
                className="vault-ai-chat-full__footer-btn"
                onClick={scrollToRecentChats}
              >
                <HistoryOutlined />
                <span>{displayText(chrome.history)}</span>
              </button>
            </div>
          </aside>

          <section className="vault-ai-chat-full__main">
            <header className="vault-ai-chat-full__main-header">
              <div className="vault-ai-chat-full__record">
                {hasRecordContext ? recordId : displayText(chrome.title)}
              </div>
              <Space size={4} className="vault-ai-chat-full__main-actions">
                {conversationId ? (
                  <>
                    {traceStatus === "active" ? (
                      <Button size="small" type="text" onClick={() => void toggleTrace(false)}>
                        {displayTextTemplate(chrome.stop_trace, { count: traceActionCount })}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="text"
                        onClick={() => void toggleTrace(true)}
                        disabled={sending || !hasRecordContext}
                      >
                        {displayText(chrome.start_trace)}
                      </Button>
                    )}
                    {(traceStatus === "active" ||
                      traceStatus === "ended" ||
                      traceActionCount > 0) && (
                      <Button
                        size="small"
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => void downloadTrace()}
                        aria-label={displayText(chrome.trace_json)}
                      />
                    )}
                  </>
                ) : null}
                <Button
                  size="small"
                  type="text"
                  icon={<CompressOutlined />}
                  onClick={() => switchView(returnViewRef.current)}
                  aria-label={displayText(
                    returnViewRef.current === "float" ? chrome.float_view : chrome.panel_view,
                  )}
                  title={displayText(
                    returnViewRef.current === "float" ? chrome.float_view : chrome.panel_view,
                  )}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={onClose}
                  aria-label={displayText(chrome.close)}
                  title={displayText(chrome.close)}
                />
              </Space>
            </header>

            <div className="vault-ai-chat-full__main-body">
              {!hasRecordContext ? (
                <Typography.Paragraph type="secondary" className="vault-ai-chat__empty">
                  {displayText(chrome.no_record_context)}
                </Typography.Paragraph>
              ) : (
                <>
                  {error && (
                    <Typography.Text type="danger" className="vault-ai-chat__error">
                      {error}
                    </Typography.Text>
                  )}
                  {messagesBlock}
                  {composerBlock}
                </>
              )}
            </div>
          </section>
        </div>
      </Modal>
    );
  }

  if (view === "float") {
    if (!open) return null;
    return createPortal(
      <div
        className="vault-ai-chat-float"
        style={{
          left: floatRect.x,
          top: floatRect.y,
          width: floatRect.width,
          height: floatRect.height,
        }}
        role="dialog"
        aria-label={displayText(chrome.title)}
      >
        <header
          className="vault-ai-chat-float__header"
          onPointerDown={onFloatHeaderPointerDown}
          onPointerMove={onFloatHeaderPointerMove}
          onPointerUp={onFloatHeaderPointerUp}
          onPointerCancel={onFloatHeaderPointerUp}
        >
          <Flex align="center" justify="space-between" className="vault-ai-chat__drawer-title">
            {titleNode}
            {surfaceHeaderActions}
          </Flex>
        </header>
        <div className="vault-ai-chat-float__body">{chatBody}</div>
        <div
          className="vault-ai-chat-float__resize vault-ai-chat-float__resize--e"
          onPointerDown={onFloatResizePointerDown("e")}
          onPointerMove={onFloatResizePointerMove}
          onPointerUp={onFloatResizePointerUp}
          onPointerCancel={onFloatResizePointerUp}
          aria-hidden
        />
        <div
          className="vault-ai-chat-float__resize vault-ai-chat-float__resize--s"
          onPointerDown={onFloatResizePointerDown("s")}
          onPointerMove={onFloatResizePointerMove}
          onPointerUp={onFloatResizePointerUp}
          onPointerCancel={onFloatResizePointerUp}
          aria-hidden
        />
        <div
          className="vault-ai-chat-float__resize vault-ai-chat-float__resize--se"
          onPointerDown={onFloatResizePointerDown("se")}
          onPointerMove={onFloatResizePointerMove}
          onPointerUp={onFloatResizePointerUp}
          onPointerCancel={onFloatResizePointerUp}
          aria-hidden
        />
      </div>,
      document.body,
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={VAULT_AI_CHAT_PANEL_WIDTH}
      destroyOnHidden
      mask={false}
      rootClassName="vault-ai-chat-drawer"
      title={
        <Flex align="center" justify="space-between" className="vault-ai-chat__drawer-title">
          {titleNode}
          {surfaceHeaderActions}
        </Flex>
      }
    >
      {chatBody}
    </Drawer>
  );
}

function MessageBubble({
  role,
  content,
  status,
  streaming,
  thinking,
  thinkingLabel,
  askUser,
  askUserDisabled,
  onSubmitAskUser,
  chrome,
  onNavigateToPage,
}: {
  role: string;
  content: string;
  status?: string;
  streaming?: boolean;
  thinking?: boolean;
  thinkingLabel?: string;
  askUser?: AskUserPrompt;
  askUserDisabled?: boolean;
  onSubmitAskUser?: (answer: string) => void;
  chrome: typeof defaultVaultAIChrome;
  onNavigateToPage?: (page: number, query?: string) => void;
}) {
  const isUser = role === "user";
  const className = [
    "vault-ai-chat__bubble",
    isUser ? "vault-ai-chat__bubble--user" : "",
    status === "cancelled" ? "vault-ai-chat__bubble--cancelled" : "",
    streaming ? "vault-ai-chat__bubble--streaming" : "",
    thinking ? "vault-ai-chat__bubble--thinking" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // When HITL widgets are shown, prefer the question alone (options render as controls).
  const displayContent = askUser?.question || content;

  const markdown = useMemo(
    () => (isUser ? displayContent : prepareVaultAIAssistantMarkdown(displayContent)),
    [displayContent, isUser],
  );

  return (
    <div className={className}>
      {isUser ? (
        content
      ) : (
        <div className="vault-ai-chat__assistant">
          <span className="vault-ai-chat__assistant-icon" aria-hidden>
            <svg viewBox="0 0 16 16" focusable="false">
              <path
                fill="currentColor"
                d="M8 0.6 9.35 6.05 14.9 7.4 9.35 8.75 8 14.3 6.65 8.75 1.1 7.4 6.65 6.05Z"
              />
            </svg>
          </span>
          <div className="vault-ai-chat__md">
            {thinking ? (
              <VaultAIThinkingIndicator
                label={thinkingLabel || displayText(chrome.thinking)}
              />
            ) : (
              <>
                <Markdown
                  components={{
                    a: ({ href, children }) => {
                      const target = parseVaultAIPageHref(href);
                      if (target && onNavigateToPage) {
                        return (
                          <button
                            type="button"
                            className="vault-ai-chat__page-link"
                            onClick={() => onNavigateToPage(target.page, target.query)}
                          >
                            {children}
                          </button>
                        );
                      }
                      if (target) {
                        return <span className="vault-ai-chat__page-ref">{children}</span>;
                      }
                      return (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {markdown}
                </Markdown>
                {streaming ? <span className="vault-ai-chat__cursor">▍</span> : null}
                {askUser && onSubmitAskUser ? (
                  <AskUserForm
                    prompt={askUser}
                    disabled={askUserDisabled}
                    chrome={chrome}
                    onSubmit={onSubmitAskUser}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
      {status === "cancelled" ? (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
          Stopped
        </Typography.Text>
      ) : null}
    </div>
  );
}

function AskUserForm({
  prompt,
  disabled,
  chrome,
  onSubmit,
}: {
  prompt: AskUserPrompt;
  disabled?: boolean;
  chrome: typeof defaultVaultAIChrome;
  onSubmit: (answer: string) => void;
}) {
  const style = (prompt.style || "textbox").toLowerCase();
  const isMulti = style === "multiple_selection" || style === "multi";
  const isSingle =
    style === "single_selection" || style === "selection" || style === "single";
  const options = prompt.options ?? [];
  const allowOther = prompt.allow_other !== false && (isSingle || isMulti);
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [useOther, setUseOther] = useState(false);

  function buildAnswer(): string {
    if (!isSingle && !isMulti) {
      return other.trim();
    }
    const parts = [...selected];
    if (allowOther && useOther && other.trim()) {
      parts.push(other.trim());
    }
    if (isMulti) {
      return parts.join(", ");
    }
    return parts[0] ?? (allowOther && useOther ? other.trim() : "");
  }

  const answer = buildAnswer();
  const canSubmit = Boolean(answer) && !disabled;

  return (
    <div className="vault-ai-chat__ask-user">
      {isSingle && options.length > 0 ? (
        <Radio.Group
          className="vault-ai-chat__ask-user-options"
          disabled={disabled}
          value={useOther ? "__other__" : selected[0]}
          onChange={(e) => {
            const v = e.target.value as string;
            if (v === "__other__") {
              setUseOther(true);
              setSelected([]);
            } else {
              setUseOther(false);
              setSelected([v]);
            }
          }}
        >
          <Space direction="vertical" size={4}>
            {options.map((opt) => (
              <Radio key={opt} value={opt}>
                {opt}
              </Radio>
            ))}
            {allowOther ? (
              <Radio value="__other__">{displayText(chrome.ask_user_other)}</Radio>
            ) : null}
          </Space>
        </Radio.Group>
      ) : null}
      {isMulti && options.length > 0 ? (
        <Checkbox.Group
          className="vault-ai-chat__ask-user-options"
          disabled={disabled}
          value={selected}
          onChange={(vals) => setSelected(vals as string[])}
        >
          <Space direction="vertical" size={4}>
            {options.map((opt) => (
              <Checkbox key={opt} value={opt}>
                {opt}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ) : null}
      {isMulti && allowOther ? (
        <Checkbox
          className="vault-ai-chat__ask-user-other-toggle"
          checked={useOther}
          disabled={disabled}
          onChange={(e) => setUseOther(e.target.checked)}
        >
          {displayText(chrome.ask_user_other)}
        </Checkbox>
      ) : null}
      {(!isSingle && !isMulti) || (allowOther && useOther) ? (
        <Input.TextArea
          className="vault-ai-chat__ask-user-input"
          value={other}
          disabled={disabled}
          placeholder={displayText(chrome.ask_user_placeholder)}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onChange={(e) => setOther(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey && canSubmit) {
              e.preventDefault();
              onSubmit(answer);
            }
          }}
        />
      ) : null}
      <Button
        type="primary"
        size="small"
        className="vault-ai-chat__ask-user-submit"
        disabled={!canSubmit}
        onClick={() => onSubmit(answer)}
      >
        {displayText(chrome.ask_user_submit)}
      </Button>
    </div>
  );
}

/** @deprecated Use VaultAIChatPanel */
export { VaultAIChatPanel as VaultAIChatModal };
