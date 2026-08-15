import {
  Button,
  Drawer,
  Dropdown,
  Input,
  Spin,
  Table,
  Tag,
  Typography,
  message as antMessage,
} from "antd";
import {
  ArrowUpOutlined,
  BulbOutlined,
  CloseOutlined,
  CommentOutlined,
  DislikeOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  DownloadOutlined,
  HistoryOutlined,
  LikeOutlined,
  MenuOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";
import { api, HttpError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useUi } from "../context/UiContext";
import { useVaultAI } from "../context/VaultAIContext";
import { useHeaderUserIdentity } from "../hooks/useHeaderUserIdentity";
import { recordDetailHref } from "../lib/fields";
import {
  defaultListChrome,
  defaultVaultAIChrome,
  displayText,
  type VaultAIChrome,
} from "../lib/i18n";
import { prepareVaultAIAssistantMarkdown } from "../lib/vaultAIPageLinks";
import "../styles/components/vault-ai-chat.css";
import "../styles/components/vault-ai-tab.css";

type ActionItem = {
  agent_name: string;
  agent_label: string;
  name: string;
  label: string;
  description?: string;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  action_name?: string;
  agent_name?: string;
  status?: string;
  token_usage?: { canvas_id?: string };
};

type Conversation = {
  id: string;
  title: string;
  last_message_at: string;
  surface?: string;
  object_name?: string;
  record_id?: string;
};

type Canvas = {
  id: string;
  vql: string;
  status: string;
  message_id?: string;
  clarify_prompt?: string;
  result?: {
    object?: string;
    object_label?: string;
    title?: string;
    columns?: Array<{ name: string; label: string }>;
    rows?: Array<Record<string, unknown>>;
    row_count?: number;
    total?: number;
    truncated?: boolean;
    error?: string;
  };
  feedback?: string;
  created_at?: string;
  updated_at?: string;
};

type Chrome = VaultAIChrome;

function VaultAITitleIcon({ className }: { className?: string }) {
  return (
    <span className={className ?? "vault-ai-tab__title-icon"} aria-hidden>
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          fill="currentColor"
          d="M8 0.6 9.35 6.05 14.9 7.4 9.35 8.75 8 14.3 6.65 8.75 1.1 7.4 6.65 6.05Z"
        />
      </svg>
    </span>
  );
}

function firstNameFromDisplay(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "there";
  const local = trimmed.includes("@") ? trimmed.split("@")[0]! : trimmed;
  const token = local.split(/[\s._-]+/).find(Boolean) || local;
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function displayTextTemplate(
  value: { text?: string; key?: string } | string | undefined,
  vars: Record<string, string>,
) {
  let text = displayText(value);
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

function humanizeFieldKey(key: string): string {
  const base = key
    .replace(/__(v|c|sys|sysr)$/i, "")
    .replace(/_/g, " ")
    .trim();
  if (!base) return key;
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isCanvasIdColumn(key: string): boolean {
  return key === "id";
}

function isCanvasNameLinkColumn(key: string): boolean {
  return key === "name__v";
}

function canvasRowRecordId(row: Record<string, unknown>): string {
  const id = row.id;
  if (id == null || id === "") return "";
  return String(id);
}

function formatCanvasCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatRelativeTime(iso: string, chrome: Chrome): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return displayText(chrome.time_just_now);
  if (min < 60)
    return displayTextTemplate(chrome.time_minutes, { count: String(min) });
  const hr = Math.floor(min / 60);
  if (hr < 24)
    return displayTextTemplate(chrome.time_hours, { count: String(hr) });
  const day = Math.floor(hr / 24);
  if (day < 30)
    return displayTextTemplate(chrome.time_days, { count: String(day) });
  return new Date(t).toLocaleDateString();
}

function formatResultTimestamp(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function resultCardTitle(c: Canvas, chrome: Chrome): string {
  const title = (c.result?.title || c.result?.object_label || "").trim();
  return title || displayText(chrome.result_list_title_fallback);
}

function canvasForAssistantTurn(
  messages: ChatMessage[],
  index: number,
  canvases: Canvas[],
): Canvas | null {
  const fromUsage = messages[index]?.token_usage?.canvas_id?.trim();
  if (fromUsage) {
    return canvases.find((c) => c.id === fromUsage) ?? null;
  }
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      const uid = messages[i]!.id;
      return canvases.find((c) => c.message_id === uid) ?? null;
    }
  }
  return null;
}

function csvCell(value: unknown): string {
  const text = formatCanvasCellValue(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCanvasCsv(c: Canvas, chrome: Chrome) {
  const rows = c.result?.rows ?? [];
  const cols = c.result?.columns?.length
    ? c.result.columns.map((col) => ({
        key: col.name,
        title: col.label || col.name,
      }))
    : rows[0]
      ? Object.keys(rows[0]).map((key) => ({ key, title: key }))
      : [];
  const lines = [
    cols.map((col) => csvCell(col.title)).join(","),
    ...rows.map((row) => cols.map((col) => csvCell(row[col.key])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resultCardTitle(c, chrome)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function canvasStatusMeta(
  status: string,
  chrome: Chrome,
): { label: string; color: string } {
  switch (status) {
    case "pending_approval":
      return {
        label: displayText(chrome.canvas_status_pending),
        color: "processing",
      };
    case "clarify":
      return {
        label: displayText(chrome.canvas_status_clarify),
        color: "warning",
      };
    case "running":
      return {
        label: displayText(chrome.canvas_status_running),
        color: "processing",
      };
    case "complete":
      return {
        label: displayText(chrome.canvas_status_complete),
        color: "success",
      };
    case "rejected":
      return {
        label: displayText(chrome.canvas_status_rejected),
        color: "default",
      };
    case "error":
      return { label: displayText(chrome.canvas_status_error), color: "error" };
    default:
      return { label: status, color: "default" };
  }
}

function TabMessageBubble({
  role,
  content,
  status,
  stoppedLabel,
  card,
}: {
  role: string;
  content: string;
  status?: string;
  stoppedLabel: string;
  card?: ReactNode;
}) {
  const isUser = role === "user";
  const streaming = status === "streaming";
  const markdown = useMemo(
    () => (isUser ? content : prepareVaultAIAssistantMarkdown(content)),
    [content, isUser],
  );
  const className = [
    "vault-ai-tab__bubble",
    isUser ? "vault-ai-tab__bubble--user" : "vault-ai-tab__bubble--assistant",
    streaming ? "vault-ai-tab__bubble--streaming" : "",
    status === "cancelled" ? "vault-ai-tab__bubble--cancelled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      {isUser ? (
        content
      ) : (
        <div className="vault-ai-tab__assistant">
          <VaultAITitleIcon className="vault-ai-tab__assistant-icon" />
          <div className="vault-ai-tab__md">
            {content || streaming ? (
              <Markdown>{markdown || (streaming ? "" : content)}</Markdown>
            ) : null}
            {streaming ? <span className="vault-ai-tab__cursor">▍</span> : null}
          </div>
        </div>
      )}
      {card}
      {status === "cancelled" ? (
        <span className="vault-ai-tab__stopped">{stoppedLabel}</span>
      ) : null}
    </div>
  );
}

export function VaultAITabPage() {
  const { session } = useAuth();
  const vaultId = session?.selectedVaultId ?? "";
  const navigate = useNavigate();
  const { requestOpenChatConversation } = useVaultAI();
  const { shell } = useUi();
  const chrome = useMemo(
    () => ({ ...defaultVaultAIChrome, ...shell.vault_ai }),
    [shell.vault_ai],
  );
  const { displayName } = useHeaderUserIdentity(vaultId, session?.username);
  const greetingName = useMemo(
    () => firstNameFromDisplay(displayName),
    [displayName],
  );

  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyItems, setHistoryItems] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectPrompt, setSelectPrompt] = useState<string | null>(null);
  const [selectActions, setSelectActions] = useState<ActionItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVql, setShowVql] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileCanvasOpen, setMobileCanvasOpen] = useState(false);
  const [openedCanvasId, setOpenedCanvasId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [suggestedOpen, setSuggestedOpen] = useState(false);
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const openedCanvas =
    openedCanvasId != null
      ? (canvases.find((c) => c.id === openedCanvasId) ?? null)
      : null;
  const activeCanvas = openedCanvas;
  const isEmpty =
    messages.length === 0 && !selectPrompt && selectActions.length === 0;
  const starterPrompts = useMemo(
    () =>
      [
        chrome.starter_prompt_1,
        chrome.starter_prompt_2,
        chrome.starter_prompt_3,
      ]
        .map((p) => displayText(p).trim())
        .filter(Boolean),
    [chrome.starter_prompt_1, chrome.starter_prompt_2, chrome.starter_prompt_3],
  );
  const taskCountLabel =
    taskCount == null
      ? displayText(chrome.tasks_pill)
      : taskCount > 100
        ? displayTextTemplate(chrome.tasks_count, { count: "100+" })
        : displayTextTemplate(chrome.tasks_count, { count: String(taskCount) });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectPrompt, selectActions, scrollToBottom]);

  useEffect(() => {
    setShowVql(false);
  }, [activeCanvas?.id]);

  const loadActions = useCallback(async () => {
    if (!vaultId) return;
    try {
      const res = await api.vaultAITabActions(vaultId);
      if (!res.availability.enabled) {
        setUnavailable(res.availability.reason ?? "unavailable");
        setActions([]);
        return;
      }
      setUnavailable(null);
      setActions(res.actions ?? []);
    } catch (err) {
      setUnavailable(err instanceof Error ? err.message : "unavailable");
    }
  }, [vaultId]);

  const loadConversations = useCallback(async () => {
    if (!vaultId) return;
    const res = await api.vaultAITabListConversations(vaultId);
    setConversations(res.items ?? []);
  }, [vaultId]);

  const loadHistory = useCallback(async () => {
    if (!vaultId) return;
    const res = await api.vaultAITabListConversations(vaultId, {
      pool: "history",
    });
    setHistoryItems(res.items ?? []);
  }, [vaultId]);

  const loadTaskCount = useCallback(async () => {
    if (!vaultId) return;
    try {
      const data = await api.taskDashboard(vaultId, {
        view: "my_tasks",
        pageSize: 1,
      });
      const assigned = data.view_counts?.my_tasks ?? 0;
      const available = data.view_counts?.available_tasks ?? 0;
      setTaskCount(assigned + available);
    } catch {
      setTaskCount(null);
    }
  }, [vaultId]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!vaultId) return;
      const res = await api.vaultAITabGetConversation(vaultId, id);
      setConversationId(res.conversation.id);
      setMessages(res.messages ?? []);
      setCanvases((res.canvases as Canvas[]) ?? []);
      setOpenedCanvasId(null);
      setMobileCanvasOpen(false);
      setSelectPrompt(null);
      setSelectActions([]);
      setHistoryOpen(false);
      setMobileNavOpen(false);
    },
    [vaultId],
  );

  const ensureConversation = useCallback(async () => {
    if (!vaultId) return null;
    if (conversationId) return conversationId;
    const created = await api.vaultAITabCreateConversation(vaultId);
    setConversationId(created.id);
    await loadConversations();
    return created.id;
  }, [vaultId, conversationId, loadConversations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadActions();
        if (cancelled) return;
        await loadConversations();
        if (cancelled) return;
        void loadTaskCount();
      } catch (err) {
        if (!cancelled) {
          setUnavailable(err instanceof Error ? err.message : "unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadActions, loadConversations, loadTaskCount]);

  async function onNewChat() {
    if (!vaultId) return;
    const created = await api.vaultAITabCreateConversation(vaultId);
    setConversationId(created.id);
    setMessages([]);
    setCanvases([]);
    setOpenedCanvasId(null);
    setMobileCanvasOpen(false);
    setSuggestedOpen(false);
    setSelectPrompt(null);
    setSelectActions([]);
    setInput("");
    setHistoryOpen(false);
    setMobileNavOpen(false);
    await loadConversations();
  }

  async function send(
    message: string,
    agentName?: string,
    actionName?: string,
  ) {
    if (!vaultId || sending) return;
    const text = message.trim();
    if (!text && !actionName) return;
    setSending(true);
    setSelectPrompt(null);
    setSelectActions([]);
    setSuggestedOpen(false);
    try {
      const cid = await ensureConversation();
      if (!cid) return;
      let streamed = "";
      setMessages((prev) => [
        ...prev,
        {
          id: `local-user-${Date.now()}`,
          role: "user",
          content: text || actionName || "",
        },
        {
          id: `local-assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          status: "streaming",
        },
      ]);
      await api.vaultAITabSendMessageStream(
        vaultId,
        cid,
        { message: text, agent_name: agentName, action_name: actionName },
        {
          onDelta: (delta) => {
            streamed += delta;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: streamed,
                  status: "streaming",
                };
              }
              return next;
            });
          },
          onSelectAction: (payload) => {
            setSelectPrompt(
              payload.prompt ?? displayText(chrome.select_action_prompt),
            );
            setSelectActions(payload.actions ?? []);
          },
          onDone: (payload) => {
            setMessages((prev) => {
              const withoutLocal = prev.filter(
                (m) => !m.id.startsWith("local-"),
              );
              const assistant = payload.assistant_message as ChatMessage;
              if (payload.canvas && !assistant.token_usage?.canvas_id) {
                assistant.token_usage = {
                  ...assistant.token_usage,
                  canvas_id: payload.canvas.id,
                };
              }
              return [
                ...withoutLocal,
                payload.user_message,
                assistant,
              ] as ChatMessage[];
            });
            if (payload.canvas) {
              setCanvases((prev) => [
                payload.canvas as Canvas,
                ...prev.filter((c) => c.id !== payload.canvas!.id),
              ]);
            }
            if (payload.select_actions?.length) {
              setSelectPrompt(displayText(chrome.select_action_prompt));
              setSelectActions(payload.select_actions);
            }
            void loadConversations();
          },
          onCancelled: () => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, status: "cancelled" };
              }
              return next;
            });
          },
          onError: (msg) => {
            antMessage.error(msg);
            setMessages((prev) =>
              prev.filter((m) => !m.id.startsWith("local-")),
            );
          },
        },
      );
      setInput("");
    } catch (err) {
      antMessage.error(err instanceof HttpError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function onApprove(approve: boolean, canvasId?: string) {
    const id = canvasId || activeCanvas?.id;
    if (!vaultId || !id || approving) return;
    setApproving(true);
    try {
      const res = await api.vaultAITabQueryApprove(vaultId, id, approve);
      const c = res.canvas;
      setCanvases((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ...c } : x)),
      );
      if (res.assistant_message) {
        setMessages((prev) => [...prev, res.assistant_message as ChatMessage]);
      }
      if (!approve) {
        setOpenedCanvasId(null);
        setMobileCanvasOpen(false);
      } else {
        setOpenedCanvasId(c.id);
        if (isNarrow) setMobileCanvasOpen(true);
      }
    } catch (err) {
      antMessage.error(err instanceof HttpError ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  }

  async function onFeedback(feedback: "up" | "down") {
    if (!vaultId || !activeCanvas) return;
    try {
      const c = await api.vaultAITabQueryFeedback(
        vaultId,
        activeCanvas.id,
        feedback,
      );
      setCanvases((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, feedback: c.feedback } : x)),
      );
    } catch (err) {
      antMessage.error(err instanceof HttpError ? err.message : String(err));
    }
  }

  function renderComposer() {
    return (
      <div className="vault-ai-tab__composer">
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={displayText(chrome.tab_input_placeholder)}
          autoSize={{ minRows: 1, maxRows: 6 }}
          variant="borderless"
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        {sending ? (
          <Button
            className="vault-ai-tab__send"
            shape="circle"
            icon={<StopOutlined />}
            onClick={() =>
              conversationId &&
              void api.vaultAITabCancel(vaultId, conversationId)
            }
            aria-label={displayText(chrome.stop)}
          />
        ) : (
          <Button
            className="vault-ai-tab__send"
            type="primary"
            shape="circle"
            icon={<ArrowUpOutlined />}
            disabled={!input.trim()}
            onClick={() => void send(input)}
            aria-label={displayText(chrome.send)}
          />
        )}
      </div>
    );
  }

  function renderActionChips(
    items: ActionItem[],
    align: "center" | "start" = "center",
  ) {
    if (items.length === 0) return null;
    return (
      <div className={`vault-ai-tab__chips vault-ai-tab__chips--${align}`}>
        {items.map((a) => (
          <button
            key={`${a.agent_name}/${a.name}`}
            type="button"
            className="vault-ai-tab__chip"
            disabled={sending}
            onClick={() => void send(a.label, a.agent_name, a.name)}
          >
            <VaultAITitleIcon />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    );
  }

  function openHistoryItem(c: Conversation) {
    if (c.surface === "chat") {
      if (!c.object_name || !c.record_id) {
        antMessage.error(displayText(chrome.history_chat_unavailable));
        return;
      }
      requestOpenChatConversation(c.id);
      navigate(recordDetailHref(vaultId, c.object_name, c.record_id));
      setHistoryOpen(false);
      setMobileNavOpen(false);
      return;
    }
    void openConversation(c.id);
  }

  function renderConversationList(
    items: Conversation[],
    opts?: { compact?: boolean; mixed?: boolean },
  ) {
    if (items.length === 0) {
      return (
        <div className="vault-ai-tab__history-empty">
          {displayText(
            opts?.compact ? chrome.untitled_chat : chrome.history_empty,
          )}
        </div>
      );
    }
    return items.map((c) => (
      <button
        key={c.id}
        type="button"
        className={`vault-ai-tab__history-item${c.id === conversationId ? " is-active" : ""}`}
        onClick={() => openHistoryItem(c)}
      >
        <span className="vault-ai-tab__history-title">
          {c.title || displayText(chrome.untitled_chat)}
        </span>
        {opts?.mixed && c.surface === "chat" ? (
          <span className="vault-ai-tab__history-source">
            {displayText(chrome.history_from_chat)}
          </span>
        ) : null}
        {c.last_message_at ? (
          <span className="vault-ai-tab__history-time">
            {formatRelativeTime(c.last_message_at, chrome)}
          </span>
        ) : null}
      </button>
    ));
  }

  function renderSidebarBody() {
    return (
      <>
        <div className="vault-ai-tab__sidebar-header">
          <div className="vault-ai-tab__brand">
            <span>{displayText(chrome.title)}</span>
            <VaultAITitleIcon />
          </div>
          <button
            type="button"
            className="vault-ai-tab__icon-btn vault-ai-tab__icon-btn--desktop"
            onClick={() => setSidebarCollapsed(true)}
            aria-label={displayText(chrome.collapse_sidebar)}
            title={displayText(chrome.collapse_sidebar)}
          >
            <DoubleLeftOutlined />
          </button>
        </div>

        <button
          type="button"
          className="vault-ai-tab__new-chat"
          onClick={() => void onNewChat()}
        >
          <CommentOutlined />
          <span>{displayText(chrome.new_chat)}</span>
        </button>

        <section className="vault-ai-tab__sidebar-section">
          <div className="vault-ai-tab__section-label">
            {displayText(chrome.recent_chats)}
          </div>
          <div className="vault-ai-tab__history-list">
            {renderConversationList(conversations, { compact: true })}
          </div>
        </section>

        <div className="vault-ai-tab__sidebar-footer">
          <button
            type="button"
            className="vault-ai-tab__footer-btn"
            onClick={() => {
              setHistoryOpen(true);
              setMobileNavOpen(false);
              void loadHistory();
            }}
          >
            <HistoryOutlined />
            <span>{displayText(chrome.history)}</span>
          </button>
        </div>
      </>
    );
  }

  function renderCanvasBody() {
    if (!activeCanvas) return null;
    const status = canvasStatusMeta(activeCanvas.status, chrome);
    const rows = activeCanvas.result?.rows ?? [];
    const objectName = (activeCanvas.result?.object ?? "").trim();
    // The backend names the columns in query order with localized labels; older
    // canvases fall back to the row keys.
    const allColumnKeys = activeCanvas.result?.columns?.length
      ? activeCanvas.result.columns.map((c) => ({
          key: c.name,
          title: c.label || c.name,
        }))
      : rows.length > 0
        ? Object.keys(rows[0]!).map((key) => ({
            key,
            title: humanizeFieldKey(key),
          }))
        : [];
    // Hide technical id by default (object lists do the same). Keep it only when
    // it is the sole SELECT column so the grid is not empty.
    const withoutId = allColumnKeys.filter((c) => !isCanvasIdColumn(c.key));
    const columnKeys = withoutId.length > 0 ? withoutId : allColumnKeys;
    const emptyLinkLabel = displayText(
      defaultListChrome.link_to_record,
      "[Link to Record]",
    );
    const columns = columnKeys.map(({ key, title }) => ({
      title,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: unknown, row: Record<string, unknown>) => {
        const text = formatCanvasCellValue(value);
        const recordId = canvasRowRecordId(row);
        const linkName =
          isCanvasNameLinkColumn(key) ||
          (isCanvasIdColumn(key) && columnKeys.length === 1);
        if (linkName && vaultId && objectName && recordId) {
          return (
            <Link
              to={recordDetailHref(vaultId, objectName, recordId)}
              className="vault-ai-tab__record-link"
            >
              {text.trim() || emptyLinkLabel}
            </Link>
          );
        }
        return text;
      },
    }));
    const rowCount = activeCanvas.result?.row_count ?? rows.length;
    const showResults =
      activeCanvas.status === "complete" ||
      Boolean(activeCanvas.result?.error) ||
      rows.length > 0;

    return (
      <>
        <div className="vault-ai-tab__canvas-header">
          <div className="vault-ai-tab__canvas-heading">
            <h2 className="vault-ai-tab__canvas-title">
              {resultCardTitle(activeCanvas, chrome)}
            </h2>
            {activeCanvas.status !== "complete" ? (
              <Tag color={status.color}>{status.label}</Tag>
            ) : null}
          </div>
          <button
            type="button"
            className="vault-ai-tab__icon-btn"
            onClick={() => {
              setOpenedCanvasId(null);
              setMobileCanvasOpen(false);
            }}
            aria-label={displayText(chrome.canvas_close)}
            title={displayText(chrome.canvas_close)}
          >
            <CloseOutlined />
          </button>
        </div>

        {activeCanvas.status === "pending_approval" ? (
          <div className="vault-ai-tab__canvas-card">
            <p className="vault-ai-tab__canvas-hint">
              {displayText(chrome.canvas_pending_hint)}
            </p>
            {activeCanvas.vql ? (
              <div className="vault-ai-tab__vql-block">
                <button
                  type="button"
                  className="vault-ai-tab__vql-toggle"
                  onClick={() => setShowVql((v) => !v)}
                >
                  {displayText(
                    showVql
                      ? chrome.canvas_hide_query
                      : chrome.canvas_review_query,
                  )}
                </button>
                {showVql ? (
                  <pre className="vault-ai-tab__vql">{activeCanvas.vql}</pre>
                ) : null}
              </div>
            ) : null}
            <div className="vault-ai-tab__canvas-actions">
              <Button
                type="primary"
                loading={approving}
                onClick={() => void onApprove(true)}
              >
                {displayText(chrome.canvas_run_query)}
              </Button>
              <Button
                disabled={approving}
                onClick={() => void onApprove(false)}
              >
                {displayText(chrome.canvas_discard)}
              </Button>
            </div>
          </div>
        ) : null}

        {activeCanvas.clarify_prompt ? (
          <div className="vault-ai-tab__canvas-card">
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {activeCanvas.clarify_prompt}
            </Typography.Paragraph>
          </div>
        ) : null}

        {activeCanvas.result?.error ? (
          <div className="vault-ai-tab__canvas-card vault-ai-tab__canvas-card--danger">
            <Typography.Text type="danger">
              {String(activeCanvas.result.error)}
            </Typography.Text>
          </div>
        ) : null}

        {activeCanvas.vql && activeCanvas.status !== "pending_approval" ? (
          <div className="vault-ai-tab__vql-block">
            <div className="vault-ai-tab__vql-toolbar">
              <button
                type="button"
                className="vault-ai-tab__vql-toggle"
                onClick={() => setShowVql((v) => !v)}
              >
                {displayText(
                  showVql ? chrome.canvas_hide_query : chrome.generated_vql,
                )}
              </button>
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadCanvasCsv(activeCanvas, chrome)}
                aria-label={displayText(chrome.download_excel)}
              >
                {displayText(chrome.download_excel)}
              </Button>
            </div>
            {showVql ? (
              <pre className="vault-ai-tab__vql">{activeCanvas.vql}</pre>
            ) : null}
          </div>
        ) : null}

        {showResults && !activeCanvas.result?.error ? (
          <div className="vault-ai-tab__canvas-results">
            <div className="vault-ai-tab__canvas-meta">
              <span>
                {displayTextTemplate(chrome.result_as_of, {
                  time: formatResultTimestamp(
                    activeCanvas.updated_at || activeCanvas.created_at,
                  ),
                })}
              </span>
              <span>
                {activeCanvas.result?.truncated
                  ? displayTextTemplate(chrome.canvas_truncated, {
                      count: String(rowCount),
                    })
                  : displayTextTemplate(chrome.canvas_row_count, {
                      count: String(rowCount),
                    })}
              </span>
            </div>
            {rows.length > 0 ? (
              <Table
                size="small"
                pagination={false}
                rowKey={(row, i) =>
                  canvasRowRecordId(row as Record<string, unknown>) || String(i)
                }
                columns={columns}
                dataSource={rows}
                scroll={{ x: true, y: 360 }}
              />
            ) : (
              <p className="vault-ai-tab__canvas-empty">
                {displayText(chrome.canvas_empty_results)}
              </p>
            )}
            {activeCanvas.status === "complete" ? (
              <div className="vault-ai-tab__feedback">
                <span>{displayText(chrome.canvas_feedback_prompt)}</span>
                <Button
                  size="small"
                  icon={<LikeOutlined />}
                  type={activeCanvas.feedback === "up" ? "primary" : "text"}
                  onClick={() => void onFeedback("up")}
                />
                <Button
                  size="small"
                  icon={<DislikeOutlined />}
                  type={activeCanvas.feedback === "down" ? "primary" : "text"}
                  onClick={() => void onFeedback("down")}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  if (!vaultId) {
    return <div className="page">{displayText(chrome.unavailable)}</div>;
  }

  if (loading) {
    return (
      <div className="page vault-ai-tab vault-ai-tab--loading">
        <Spin />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="page vault-ai-tab vault-ai-tab--unavailable">
        <Typography.Title level={3}>
          {displayText(chrome.title)}
        </Typography.Title>
        <Typography.Paragraph>
          {displayTextTemplate(chrome.unavailable_with_reason, {
            reason: unavailable,
          })}
        </Typography.Paragraph>
      </div>
    );
  }

  const layoutClass = [
    "vault-ai-tab__layout",
    sidebarCollapsed ? "vault-ai-tab__layout--sidebar-collapsed" : "",
    activeCanvas ? "vault-ai-tab__layout--with-canvas" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="page vault-ai-tab">
      <div className={layoutClass}>
        <button
          type="button"
          className="vault-ai-tab__mobile-menu"
          onClick={() => setMobileNavOpen(true)}
          aria-label={displayText(chrome.open_menu)}
        >
          <MenuOutlined />
        </button>

        {sidebarCollapsed ? (
          <button
            type="button"
            className="vault-ai-tab__sidebar-expand"
            onClick={() => setSidebarCollapsed(false)}
            aria-label={displayText(chrome.expand_sidebar)}
            title={displayText(chrome.expand_sidebar)}
          >
            <DoubleRightOutlined />
          </button>
        ) : (
          <aside className="vault-ai-tab__sidebar vault-ai-tab__sidebar--desktop">
            {renderSidebarBody()}
          </aside>
        )}

        <section className="vault-ai-tab__main">
          {isEmpty ? (
            <div className="vault-ai-tab__empty">
              <div className="vault-ai-tab__greeting">
                <span className="vault-ai-tab__greeting-hi">
                  {displayTextTemplate(chrome.greeting_hi, {
                    name: greetingName,
                  })}
                </span>
                <VaultAITitleIcon />
              </div>
              <h1 className="vault-ai-tab__help-prompt">
                {displayText(chrome.help_prompt)}
              </h1>
              {renderComposer()}
              <div className="vault-ai-tab__empty-pills">
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "show-my-tasks",
                        label: displayText(chrome.show_my_tasks),
                        onClick: () => navigate("/"),
                      },
                    ],
                  }}
                >
                  <button type="button" className="vault-ai-tab__pill">
                    <UnorderedListOutlined />
                    <span>{taskCountLabel}</span>
                  </button>
                </Dropdown>
                <button
                  type="button"
                  className={`vault-ai-tab__pill${suggestedOpen ? " is-active" : ""}`}
                  onClick={() => setSuggestedOpen((v) => !v)}
                >
                  <BulbOutlined />
                  <span>{displayText(chrome.suggested)}</span>
                </button>
              </div>
              {suggestedOpen && starterPrompts.length > 0 ? (
                <div className="vault-ai-tab__starters">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="vault-ai-tab__starter"
                      disabled={sending}
                      onClick={() => void send(prompt)}
                    >
                      <VaultAITitleIcon />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div ref={messagesRef} className="vault-ai-tab__messages">
                {messages.map((m, index) => {
                  const cardCanvas =
                    m.role === "assistant"
                      ? canvasForAssistantTurn(messages, index, canvases)
                      : null;
                  const showCard =
                    cardCanvas &&
                    (cardCanvas.status === "complete" ||
                      cardCanvas.status === "pending_approval" ||
                      cardCanvas.status === "error");
                  return (
                    <TabMessageBubble
                      key={m.id}
                      role={m.role}
                      content={m.content}
                      status={m.status}
                      stoppedLabel={displayText(chrome.stopped)}
                      card={
                        showCard && cardCanvas ? (
                          <div className="vault-ai-tab__result-card">
                            <div className="vault-ai-tab__result-card-copy">
                              <strong>{resultCardTitle(cardCanvas, chrome)}</strong>
                              <span>
                                {formatResultTimestamp(
                                  cardCanvas.updated_at ||
                                    cardCanvas.created_at,
                                )}
                              </span>
                            </div>
                            {cardCanvas.status === "pending_approval" ? (
                              <Button
                                type="primary"
                                size="small"
                                loading={approving}
                                onClick={() => {
                                  setOpenedCanvasId(cardCanvas.id);
                                  void onApprove(true, cardCanvas.id);
                                }}
                              >
                                {displayText(chrome.canvas_run_query)}
                              </Button>
                            ) : (
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => {
                                  setOpenedCanvasId(cardCanvas.id);
                                  setShowVql(false);
                                  if (isNarrow) setMobileCanvasOpen(true);
                                }}
                              >
                                {displayText(
                                  openedCanvasId === cardCanvas.id
                                    ? chrome.result_opened
                                    : chrome.result_open,
                                )}
                              </Button>
                            )}
                          </div>
                        ) : null
                      }
                    />
                  );
                })}
                {(selectPrompt || selectActions.length > 0) && (
                  <div className="vault-ai-tab__select">
                    {selectPrompt ? (
                      <p className="vault-ai-tab__select-prompt">
                        {selectPrompt}
                      </p>
                    ) : null}
                    {renderActionChips(
                      selectActions.length ? selectActions : actions,
                      "start",
                    )}
                  </div>
                )}
              </div>
              <div className="vault-ai-tab__composer-dock">
                {renderComposer()}
              </div>
            </>
          )}

          <p className="vault-ai-tab__disclaimer">
            {displayText(chrome.tab_disclaimer)}
          </p>
        </section>

        {activeCanvas ? (
          <aside className="vault-ai-tab__canvas vault-ai-tab__canvas--desktop">
            {renderCanvasBody()}
          </aside>
        ) : null}
      </div>

      <Drawer
        title={displayText(chrome.title)}
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        width={280}
        className="vault-ai-tab__drawer"
        styles={{ body: { padding: 12 } }}
      >
        <div className="vault-ai-tab__sidebar vault-ai-tab__sidebar--drawer">
          {renderSidebarBody()}
        </div>
      </Drawer>

      <Drawer
        title={displayText(chrome.history_title)}
        placement="left"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={360}
        className="vault-ai-tab__drawer"
      >
        <div className="vault-ai-tab__history-list vault-ai-tab__history-list--drawer">
          {renderConversationList(historyItems, { mixed: true })}
        </div>
      </Drawer>

      <Drawer
        title={displayText(chrome.canvas_title)}
        placement="right"
        open={Boolean(activeCanvas) && mobileCanvasOpen && isNarrow}
        onClose={() => setMobileCanvasOpen(false)}
        width={420}
        className="vault-ai-tab__drawer"
        styles={{ body: { padding: 16 } }}
      >
        <div className="vault-ai-tab__canvas vault-ai-tab__canvas--drawer">
          {renderCanvasBody()}
        </div>
      </Drawer>
    </div>
  );
}
