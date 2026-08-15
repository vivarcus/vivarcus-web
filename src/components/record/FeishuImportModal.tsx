import { Button, Divider, Empty, Input, List, Modal, Segmented, Spin, Tree, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { FileOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type Key } from "react";
import { api, HttpError } from "../../api/client";
import type { FeishuBrowsableItem, FeishuImportAvailability } from "../../api/types";
import { displayText, displayTextTemplate } from "../../lib/i18n";
import { defaultDocumentViewerChrome, defaultShellChrome, type DocumentViewerChrome } from "../../lib/i18n/chromeTypes";
import { useUi } from "../../context/UiContext";

const FEISHU_SDK_SRC =
  "https://lf3-cdn-tos.bytegoofy.com/obj/goofy/locl/lark/external_js_sdk/h5-js-sdk-1.2.21.js";

const ROOT_FOLDER_KEY = "";

type BrowseMode = "my_space" | "shared";

type Props = {
  open: boolean;
  vaultId: string;
  availability: FeishuImportAvailability | null;
  onClose: () => void;
  onPicked: (file: {
    file_token: string;
    file_type: string;
    title: string;
    url: string;
  }) => Promise<void>;
};

declare global {
  interface Window {
    webComponent?: {
      config: (opts: Record<string, unknown>) => Promise<unknown>;
      render: (
        name: string,
        props: Record<string, unknown>,
        el: HTMLElement,
      ) => { unmount?: () => void } | void;
      onError?: (cb: (err: Error) => void) => void;
      onAuthError?: (cb: (err: Error) => void) => void;
    };
  }
}

function loadFeishuSDK(): Promise<void> {
  if (window.webComponent) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${FEISHU_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Feishu SDK")));
      return;
    }
    const script = document.createElement("script");
    script.src = FEISHU_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Feishu SDK"));
    document.body.appendChild(script);
  });
}

function docTypeLabel(type: number | string | undefined): string {
  const n = typeof type === "string" ? Number(type) : type;
  switch (n) {
    case 1:
      return "doc";
    case 2:
      return "sheet";
    case 3:
      return "bitable";
    case 5:
      return "file";
    case 8:
      return "docx";
    default:
      return String(type ?? "docx");
  }
}

function fileTypeDisplay(type: string, chrome: DocumentViewerChrome): string {
  switch (type.toLowerCase()) {
    case "doc":
    case "docx":
      return displayText(chrome.file_type_document);
    case "sheet":
      return displayText(chrome.file_type_spreadsheet);
    case "bitable":
      return displayText(chrome.file_type_bitable);
    case "file":
      return displayText(chrome.file_type_file);
    default:
      return type;
  }
}

function isFeishuPermissionErrorMessage(message: string, chrome: DocumentViewerChrome): boolean {
  return message === displayText(chrome.feishu_permission_error);
}

function feishuBrowseErrorMessage(err: unknown, chrome: DocumentViewerChrome): string {
  return feishuSearchErrorMessage(err, chrome);
}

function feishuSearchErrorMessage(err: unknown, chrome: DocumentViewerChrome): string {
  const raw =
    err instanceof HttpError ? err.message : err instanceof Error ? err.message : "";
  const lower = raw.toLowerCase();
  const status = err instanceof HttpError ? err.status : 0;

  if (
    status === 404 ||
    lower.includes("404") ||
    lower.includes("page not found") ||
    lower.includes("not found")
  ) {
    return displayText(chrome.search_unavailable);
  }
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("unauthorized") ||
    lower.includes("re-authorization") ||
    lower.includes("search:docs:read") ||
    lower.includes("99991679") ||
    lower.includes("permission")
  ) {
    return displayText(chrome.feishu_permission_error);
  }
  return displayText(chrome.search_failed);
}

function feishuPickerErrorMessage(err: unknown, chrome: DocumentViewerChrome): string {
  const raw =
    err instanceof HttpError ? err.message : err instanceof Error ? err.message : "";
  const lower = raw.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("permission")) {
    return displayText(chrome.feishu_permission_error);
  }
  return displayText(chrome.picker_failed);
}

function folderNodes(items: FeishuBrowsableItem[]): DataNode[] {
  return items
    .filter((item) => item.kind === "folder")
    .map((item) => ({
      title: item.title,
      key: item.file_token,
      isLeaf: false,
    }));
}

function updateTreeChildren(nodes: DataNode[], key: string, children: DataNode[]): DataNode[] {
  return nodes.map((node) => {
    if (node.key === key) {
      return { ...node, children, isLeaf: children.length === 0 };
    }
    if (node.children?.length) {
      return { ...node, children: updateTreeChildren(node.children, key, children) };
    }
    return node;
  });
}

function findNodeChildren(nodes: DataNode[], key: string): DataNode[] {
  return findNode(nodes, key)?.children ?? [];
}

function findNode(nodes: DataNode[], key: string): DataNode | null {
  for (const node of nodes) {
    if (String(node.key) === key) {
      return node;
    }
    if (node.children?.length) {
      const found = findNode(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function mergeFolderNodes(existing: DataNode[], incoming: DataNode[]): DataNode[] {
  const byKey = new Map(existing.map((n) => [String(n.key), n]));
  for (const node of incoming) {
    if (!byKey.has(String(node.key))) {
      byKey.set(String(node.key), node);
    }
  }
  return Array.from(byKey.values());
}

function initialTree(rootFolderTitle: string): DataNode[] {
  return [{ title: rootFolderTitle, key: ROOT_FOLDER_KEY, isLeaf: false, children: [] }];
}

function FileResultList({
  files,
  importing,
  emptyDescription,
  chrome,
  onPick,
}: {
  files: FeishuBrowsableItem[];
  importing: boolean;
  emptyDescription: string;
  chrome: DocumentViewerChrome;
  onPick: (item: FeishuBrowsableItem) => void;
}) {
  if (files.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
  }
  return (
    <List
      size="small"
      dataSource={files}
      renderItem={(item) => (
        <List.Item
          style={{ cursor: importing ? "not-allowed" : "pointer", paddingInline: 4 }}
          onClick={() => {
            if (!importing) {
              onPick(item);
            }
          }}
        >
          <List.Item.Meta
            avatar={<FileOutlined />}
            title={item.title}
            description={fileTypeDisplay(item.file_type ?? "file", chrome)}
          />
        </List.Item>
      )}
    />
  );
}

export function FeishuImportModal({ open, vaultId, availability, onClose, onPicked }: Props) {
  const { shell } = useUi();
  const chrome = useMemo(
    () => ({ ...defaultDocumentViewerChrome, ...shell.document_viewer }),
    [shell.document_viewer],
  );
  const rootFolderTitle = displayText(chrome.my_space);
  const mountRef = useRef<HTMLDivElement>(null);
  const onPickedRef = useRef(onPicked);
  const onCloseRef = useRef(onClose);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<BrowseMode>("my_space");
  const [searchReady, setSearchReady] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<DataNode[]>(() => initialTree(rootFolderTitle));
  const [selectedFolderKey, setSelectedFolderKey] = useState(ROOT_FOLDER_KEY);
  const [selectedFolderTitle, setSelectedFolderTitle] = useState(rootFolderTitle);
  const [files, setFiles] = useState<FeishuBrowsableItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [folderHasMore, setFolderHasMore] = useState(false);
  const [folderNextPage, setFolderNextPage] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [sharedQuery, setSharedQuery] = useState("");
  const [sharedFiles, setSharedFiles] = useState<FeishuBrowsableItem[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const profileId = availability?.profile_id;
  const authorized = availability?.authorized === true;

  useEffect(() => {
    onPickedRef.current = onPicked;
    onCloseRef.current = onClose;
  }, [onClose, onPicked]);

  const pickFile = useCallback(
    async (file: { file_token: string; file_type: string; title: string; url: string }) => {
      try {
        setImporting(true);
        await onPickedRef.current(file);
        onCloseRef.current();
      } catch (err) {
        message.error(err instanceof Error ? err.message : displayText(chrome.import_failed));
      } finally {
        setImporting(false);
      }
    },
    [chrome],
  );

  const pickBrowsable = useCallback(
    (item: FeishuBrowsableItem) => {
      void pickFile({
        file_token: item.file_token,
        file_type: item.file_type ?? "file",
        title: item.title,
        url: item.url ?? "",
      });
    },
    [pickFile],
  );

  const startFeishuOAuth = useCallback(
    async (profile?: string) => {
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const { authorize_url } = await api.startFeishuImportOAuth(vaultId, {
        profile_id: profile ?? availability?.profile_id,
        return_path: returnPath,
      });
      window.location.href = authorize_url;
    },
    [availability?.profile_id, vaultId],
  );

  const ensureAuthorized = useCallback(async () => {
    if (!availability?.enabled) {
      throw new Error(displayText(chrome.feishu_not_enabled));
    }
    if (availability.authorized) {
      return availability;
    }
    await startFeishuOAuth(availability.profile_id);
    return null;
  }, [availability, chrome, startFeishuOAuth]);

  const reconnectFeishu = useCallback(async () => {
    if (!availability?.enabled || reconnecting) {
      return;
    }
    setReconnecting(true);
    try {
      await api.revokeFeishuImportAuth(vaultId, { profile_id: availability.profile_id });
      await startFeishuOAuth(availability.profile_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(chrome.reconnect_failed));
      setReconnecting(false);
    }
  }, [availability?.enabled, availability?.profile_id, chrome, reconnecting, startFeishuOAuth, vaultId]);

  const fetchFolder = useCallback(
    async (folderToken: string, pageToken?: string) => {
      return api.listFeishuImportFiles(vaultId, {
        profile_id: availability?.profile_id,
        folder_token: folderToken || undefined,
        page_token: pageToken,
      });
    },
    [availability?.profile_id, vaultId],
  );

  const loadFolderContents = useCallback(
    async (folderKey: string, folderTitle: string, updateTree: boolean) => {
      setBrowseLoading(true);
      setBrowseError(null);
      try {
        const res = await fetchFolder(folderKey);
        const items = res.items ?? [];
        setFiles(items.filter((item) => item.kind === "file"));
        setFolderHasMore(Boolean(res.has_more && res.next_page_token));
        setFolderNextPage(res.next_page_token);
        setSelectedFolderKey(folderKey);
        setSelectedFolderTitle(folderTitle);
        if (updateTree) {
          const children = folderNodes(items);
          setTreeData((prev) => updateTreeChildren(prev, folderKey, children));
        }
      } catch (err) {
        setFiles([]);
        setFolderHasMore(false);
        setFolderNextPage(undefined);
        setBrowseError(feishuBrowseErrorMessage(err, chrome));
      } finally {
        setBrowseLoading(false);
      }
    },
    [chrome, fetchFolder],
  );

  const loadMoreFolderFiles = useCallback(async () => {
    if (!folderNextPage || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const res = await fetchFolder(selectedFolderKey, folderNextPage);
      const items = res.items ?? [];
      const moreFiles = items.filter((item) => item.kind === "file");
      setFiles((prev) => [...prev, ...moreFiles]);
      setFolderHasMore(Boolean(res.has_more && res.next_page_token));
      setFolderNextPage(res.next_page_token);
      const children = folderNodes(items);
      if (children.length) {
        setTreeData((prev) => {
          const existing = findNodeChildren(prev, selectedFolderKey);
          const merged = mergeFolderNodes(existing, children);
          return updateTreeChildren(prev, selectedFolderKey, merged);
        });
      }
    } catch (err) {
      message.error(
        err instanceof HttpError
          ? err.message
          : err instanceof Error
            ? err.message
            : displayText(shell.action_failed),
      );
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFolder, folderNextPage, loadingMore, selectedFolderKey, shell.action_failed]);

  const runSharedSearch = useCallback(
    async (q: string) => {
      setSharedLoading(true);
      setSharedError(null);
      try {
        const res = await api.searchFeishuImportFiles(vaultId, {
          profile_id: availability?.profile_id,
          q,
        });
        setSharedFiles((res.items ?? []).filter((item) => item.kind === "file"));
      } catch (err) {
        setSharedFiles([]);
        setSharedError(feishuSearchErrorMessage(err, chrome));
      } finally {
        setSharedLoading(false);
      }
    },
    [availability?.profile_id, chrome, vaultId],
  );

  useEffect(() => {
    if (!open || !availability?.enabled || availability?.authorized) {
      return;
    }
    void ensureAuthorized();
  }, [open, availability?.enabled, availability?.authorized, ensureAuthorized]);

  // Reset browse/search UI only when the modal closes. Do not depend on load
  // callbacks here — they change when chrome identity changes and would loop
  // setState while the modal stays closed (breaks document page navigation).
  useEffect(() => {
    if (open) {
      return;
    }
    setMode("my_space");
    setTreeData(initialTree(rootFolderTitle));
    setSelectedFolderKey(ROOT_FOLDER_KEY);
    setSelectedFolderTitle(rootFolderTitle);
    setFiles([]);
    setBrowseError(null);
    setFolderHasMore(false);
    setFolderNextPage(undefined);
    setSharedQuery("");
    setSharedFiles([]);
    setSharedError(null);
    setSearchReady(false);
    setSearchError(null);
  }, [open, rootFolderTitle]);

  useEffect(() => {
    if (!open || !availability?.enabled || !availability.authorized) {
      return;
    }
    void loadFolderContents(ROOT_FOLDER_KEY, rootFolderTitle, true);
  }, [open, availability?.enabled, availability?.authorized, loadFolderContents, rootFolderTitle]);

  useEffect(() => {
    if (!open || !availability?.enabled || !availability.authorized || mode !== "shared") {
      return;
    }
    void runSharedSearch(sharedQuery);
  }, [open, availability?.enabled, availability?.authorized, mode, runSharedSearch]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: load recent on tab enter, not on every keystroke

  useEffect(() => {
    if (open && mode === "shared") {
      return;
    }
    setSearchReady(false);
    setSearchError(null);
  }, [open, mode]);

  const onTreeSelect = (keys: Key[], info: { node: DataNode }) => {
    if (!keys.length || importing) {
      return;
    }
    const key = String(keys[0]);
    const title = typeof info.node.title === "string" ? info.node.title : selectedFolderTitle;
    void loadFolderContents(key, title, false);
  };

  const onTreeLoadData = async (node: DataNode) => {
    if (node.children && node.children.length > 0) {
      return;
    }
    const key = String(node.key);
    const res = await fetchFolder(key);
    const children = folderNodes(res.items ?? []);
    setTreeData((prev) => updateTreeChildren(prev, key, children));
  };

  useEffect(() => {
    if (!open || !availability?.enabled || !authorized || !profileId || mode !== "shared") {
      return;
    }
    let cancelled = false;
    let unmount: (() => void) | undefined;
    (async () => {
      try {
        setSearchReady(false);
        setSearchError(null);
        await loadFeishuSDK();
        if (cancelled || !window.webComponent) {
          return;
        }
        const waitForMount = (): Promise<HTMLDivElement> =>
          new Promise((resolve, reject) => {
            const started = performance.now();
            const tick = () => {
              if (cancelled) {
                reject(new Error("cancelled"));
                return;
              }
              const el = mountRef.current;
              if (el) {
                resolve(el);
                return;
              }
              if (performance.now() - started > 3000) {
                reject(new Error("Feishu picker mount point not ready"));
                return;
              }
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
        const mountEl = await waitForMount();
        const pageURL = window.location.href.split("#")[0];
        const sig = await api.getFeishuWebComponentSignature(vaultId, {
          profile_id: profileId,
          url: pageURL,
        });
        if (cancelled || !mountRef.current) {
          return;
        }
        await window.webComponent.config({
          openId: sig.open_id,
          signature: sig.signature,
          appId: sig.app_id,
          timestamp: sig.timestamp,
          nonceStr: sig.nonce_str,
          url: sig.url,
          jsApiList: ["selector"],
          locale: "zh-CN",
        });
        if (cancelled || !mountRef.current) {
          return;
        }
        mountEl.innerHTML = "";
        const rendered = window.webComponent.render(
          "Selector",
          {
            searchEntityTypes: [7],
            placeholder: "Search My Space, Shared, and Wiki",
            triggerWidth: 680,
            panelWidth: 680,
            searchFilter: {
              docFilter: {
                // DOC, SHEET, BITABLE, FILE, DOCX
                type: [1, 2, 3, 5, 8],
                onlyTitle: false,
              },
            },
            onSelect: (data: {
              title?: string;
              type?: string;
              entity?: { token?: string; type?: number; url?: string; name?: string; docUrl?: string };
            }) => {
              const token = data.entity?.token;
              if (!token) {
                message.error(displayText(chrome.no_file_token));
                return;
              }
              void pickFile({
                file_token: token,
                file_type: docTypeLabel(data.entity?.type),
                title: data.entity?.name || data.title || "feishu-doc",
                url: data.entity?.url || data.entity?.docUrl || "",
              });
            },
          },
          mountEl,
        );
        if (rendered && typeof rendered === "object" && "unmount" in rendered) {
          unmount = rendered.unmount;
        }
        if (!cancelled) {
          setSearchReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = feishuPickerErrorMessage(err, chrome);
          setSearchError(msg);
          message.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
      unmount?.();
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [open, availability?.enabled, authorized, profileId, pickFile, vaultId, mode, chrome]);

  const showReconnect =
    isFeishuPermissionErrorMessage(sharedError ?? "", chrome) ||
    isFeishuPermissionErrorMessage(searchError ?? "", chrome) ||
    isFeishuPermissionErrorMessage(browseError ?? "", chrome);

  return (
    <Modal
      title={displayText(chrome.import_from_feishu)}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={importing}>
          {displayText(shell.cancel ?? defaultShellChrome.cancel)}
        </Button>,
      ]}
      destroyOnClose
      width={760}
      maskClosable={!importing}
      closable={!importing}
      styles={{ body: { overflow: "visible", position: "relative" } }}
    >
      {importing ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "rgba(255, 255, 255, 0.82)",
            borderRadius: 6,
          }}
        >
          <Spin size="large" />
          <p style={{ margin: 0, color: "rgba(0, 0, 0, 0.65)", textAlign: "center" }}>
            {displayText(chrome.importing_from_feishu)}
            <br />
            <span style={{ fontSize: 12 }}>{displayText(chrome.feishu_export_hint)}</span>
          </p>
        </div>
      ) : null}
      {!availability?.authorized ? (
        <p>{displayText(chrome.redirecting_authorize)}</p>
      ) : (
        <>
          <Segmented
            block
            value={mode}
            onChange={(v) => setMode(v as BrowseMode)}
            options={[
              { label: displayText(chrome.my_space), value: "my_space" },
              { label: displayText(chrome.shared_and_wiki), value: "shared" },
            ]}
            style={{ marginBottom: 12 }}
            disabled={importing}
          />
          {mode === "my_space" ? (
            <>
              <p style={{ marginTop: 0 }}>
                {displayText(chrome.browse_my_space_hint)}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  minHeight: 300,
                  border: "1px solid #f0f0f0",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "38%",
                    borderRight: "1px solid #f0f0f0",
                    padding: "8px 4px",
                    overflow: "auto",
                    maxHeight: 320,
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(0,0,0,0.45)",
                      padding: "0 8px 6px",
                    }}
                  >
                    {displayText(chrome.folders)}
                  </div>
                  <Tree
                    showIcon
                    blockNode
                    selectedKeys={[selectedFolderKey]}
                    treeData={treeData}
                    loadData={onTreeLoadData}
                    onSelect={onTreeSelect}
                  />
                </div>
                <div style={{ flex: 1, padding: "8px 12px", overflow: "auto", maxHeight: 320 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(0,0,0,0.45)",
                      marginBottom: 6,
                    }}
                  >
                    {displayTextTemplate(chrome.files_in_folder, { folder: selectedFolderTitle })}
                  </div>
                  {browseLoading ? (
                    <div style={{ textAlign: "center", padding: 24 }}>
                      <Spin size="small" />
                    </div>
                  ) : browseError ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <>
                          {browseError}
                          {isFeishuPermissionErrorMessage(browseError, chrome) ? (
                            <>
                              <br />
                              <Button
                                type="link"
                                size="small"
                                loading={reconnecting}
                                onClick={() => void reconnectFeishu()}
                                style={{ padding: 0, height: "auto" }}
                              >
                                {displayText(chrome.reconnect_feishu)}
                              </Button>
                            </>
                          ) : null}
                        </>
                      }
                    />
                  ) : (
                    <>
                      <FileResultList
                        files={files}
                        importing={importing}
                        emptyDescription={displayText(chrome.no_importable_files)}
                        chrome={chrome}
                        onPick={pickBrowsable}
                      />
                      {folderHasMore ? (
                        <div style={{ textAlign: "center", marginTop: 8 }}>
                          <Button
                            size="small"
                            loading={loadingMore}
                            disabled={importing}
                            onClick={() => void loadMoreFolderFiles()}
                          >
                            {displayText(chrome.load_more)}
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>
                {displayText(chrome.search_shared_hint)}
              </p>
              <Input.Search
                allowClear
                enterButton={displayText(chrome.search)}
                placeholder={displayText(chrome.search_placeholder)}
                value={sharedQuery}
                disabled={importing || sharedLoading}
                onChange={(e) => setSharedQuery(e.target.value)}
                onSearch={(v) => void runSharedSearch(v)}
                style={{ marginBottom: 12 }}
              />
              <div
                style={{
                  minHeight: 180,
                  maxHeight: 240,
                  overflow: "auto",
                  border: "1px solid #f0f0f0",
                  borderRadius: 6,
                  padding: "8px 12px",
                  marginBottom: 8,
                }}
              >
                {sharedLoading ? (
                  <div style={{ textAlign: "center", padding: 24 }}>
                    <Spin size="small" />
                  </div>
                ) : sharedError ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <>
                        {sharedError}
                        {isFeishuPermissionErrorMessage(sharedError, chrome) ? (
                          <>
                            <br />
                            <Button
                              type="link"
                              size="small"
                              loading={reconnecting}
                              onClick={() => void reconnectFeishu()}
                              style={{ padding: 0, height: "auto" }}
                            >
                              {displayText(chrome.reconnect_feishu)}
                            </Button>
                          </>
                        ) : null}
                      </>
                    }
                  />
                ) : (
                  <FileResultList
                    files={sharedFiles}
                    importing={importing}
                    emptyDescription={displayText(chrome.no_matching_files)}
                    chrome={chrome}
                    onPick={pickBrowsable}
                  />
                )}
              </div>
              <Divider plain style={{ margin: "12px 0" }}>
                {displayText(chrome.or_feishu_picker)}
              </Divider>
              <div
                ref={mountRef}
                style={{ minHeight: 40, position: "relative", zIndex: 1, overflow: "visible" }}
              />
              {!searchReady && !searchError ? (
                <p style={{ marginBottom: 0, color: "rgba(0,0,0,0.45)" }}>
                  {displayText(chrome.loading_feishu_picker)}
                </p>
              ) : null}
              {searchError ? (
                <p style={{ marginBottom: 0, color: "#cf1322" }}>
                  {searchError}
                  {showReconnect ? (
                    <>
                      {" "}
                      <Button
                        type="link"
                        size="small"
                        loading={reconnecting}
                        onClick={() => void reconnectFeishu()}
                        style={{ padding: 0, height: "auto" }}
                      >
                        {displayText(chrome.reconnect_feishu)}
                      </Button>
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
