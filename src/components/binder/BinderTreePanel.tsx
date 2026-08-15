import { Alert, Button, Checkbox, Dropdown, Input, Modal, Select, Spin, Table, Tree, message } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { BinderDocumentItem, BinderTreeModel, BinderTreeNode } from "../../api/types";
import { displayText, displayTextTemplate } from "../../lib/i18n";
import { encodeNavTrail, withNavTrail } from "../../lib/navTrail";
import type { BinderChrome } from "../../lib/i18n/chromeTypes";
import { ObjectReferenceInput } from "../ObjectReferenceInput";

type Props = {
  vaultId: string;
  binderId: string;
  readonly?: boolean;
};

type BindingTarget = {
  scope: "binder" | "section" | "document";
  sectionId?: string;
  nodeIds: string[];
};

function sectionLabel(node: BinderTreeNode | undefined) {
  if (!node) return "";
  return node.number ? `${node.number} ${node.name}` : node.name;
}

function filingOriginLabel(chrome: BinderChrome | undefined, origin?: string) {
  switch (origin) {
    case "auto":
      return displayText(chrome?.filing_origin_auto, "Auto-filed");
    case "manual":
      return displayText(chrome?.filing_origin_manual, "Manually filed");
    default:
      return origin ?? "—";
  }
}

function ancestorSectionIds(nodes: BinderTreeNode[], selectedId?: string) {
  if (!selectedId) return [] as string[];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const out: string[] = [];
  let current = byId.get(selectedId);
  while (current?.parent_id) {
    out.push(current.parent_id);
    current = byId.get(current.parent_id);
  }
  return out;
}

function buildCreateDocumentHref(
  binderId: string,
  binderName: string,
  sectionId: string,
  defaults: Record<string, string> | undefined,
) {
  const q = new URLSearchParams();
  q.set("page", "document_page__v");
  q.set("binder_id", binderId);
  q.set("binder_section_id", sectionId);
  for (const [field, value] of Object.entries(defaults ?? {})) {
    if (value) q.set(`prefill.${field}`, value);
  }
  const trail = encodeNavTrail([
    {
      href: `/objects/document__v/records/${encodeURIComponent(binderId)}`,
      label: binderName || binderId,
    },
  ]);
  return withNavTrail(`/objects/document__v/create?${q.toString()}`, trail);
}

function menuGroups(groups: Array<{ key: string; label: string; children: MenuProps["items"] }>) {
  return groups
    .filter((group) => (group.children ?? []).length > 0)
    .map((group) => ({
      key: group.key,
      type: "group" as const,
      label: group.label,
      children: group.children,
    }));
}

export function BinderTreePanel({ vaultId, binderId, readonly = false }: Props) {
  const navigate = useNavigate();
  const [model, setModel] = useState<BinderTreeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [hideEmpty, setHideEmpty] = useState(true);
  const [filingOrigin, setFilingOrigin] = useState<string>("all");
  const [bindingFilter, setBindingFilter] = useState<string>("all");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addSectionId, setAddSectionId] = useState<string | undefined>();
  const [addDocumentId, setAddDocumentId] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | undefined>();
  const [mutating, setMutating] = useState(false);
  const [sectionModal, setSectionModal] = useState<"create" | "rename" | null>(null);
  const [sectionModalTargetId, setSectionModalTargetId] = useState<string | undefined>();
  const [sectionNumber, setSectionNumber] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [bindingOpen, setBindingOpen] = useState(false);
  const [bindingTarget, setBindingTarget] = useState<BindingTarget>({ scope: "binder", nodeIds: [] });
  const [bindingMode, setBindingMode] = useState("latest_steady");
  const [bindingOverwrite, setBindingOverwrite] = useState(false);
  const [bindingVersionId, setBindingVersionId] = useState<string | undefined>();
  const [versionOptions, setVersionOptions] = useState<Array<{ value: string; label: string }>>([]);

  const chrome = model?.chrome;
  const treeNodes = model?.tree.nodes ?? [];
  const canRefresh = !readonly && Boolean(model?.refresh_autofiling_allowed);
  // Steady-state (Approved) Binders lock manual structure/binding edits; Refresh Auto-Filing still works.
  const canEdit = !readonly && Boolean(model?.manual_edit_allowed);
  const canManageSections = canEdit && Boolean(model?.manage_sections_allowed ?? true);
  const showActions = canEdit || canRefresh;
  const nodeById = useMemo(() => new Map(treeNodes.map((node) => [node.id, node])), [treeNodes]);
  const selectedNode = sectionId ? nodeById.get(sectionId) : undefined;
  const selectedIsCustom = Boolean(selectedNode?.is_custom);
  const totalSectionCount = model?.total_section_count ?? 0;

  const load = useCallback(async () => {
    if (!vaultId || !binderId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.binderTree(vaultId, {
        binderId,
        sectionId,
        hideEmptySections: hideEmpty,
        filingOrigin,
        bindingFilter,
        readonly,
      });
      setModel(next);
      if (!sectionId && next.selected_section_id) {
        setSectionId(next.selected_section_id);
      }
      setSelectedRowKeys([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(undefined, "Failed to load Binder"));
    } finally {
      setLoading(false);
    }
  }, [vaultId, binderId, sectionId, hideEmpty, filingOrigin, bindingFilter, readonly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const nodes = model?.tree.nodes ?? [];
    const selected = sectionId ?? model?.selected_section_id;
    if (nodes.length === 0) return;
    const parentIds = new Set(nodes.map((node) => node.parent_id).filter((id): id is string => Boolean(id)));
    const defaultExpanded = nodes.filter((node) => parentIds.has(node.id)).map((node) => node.id);
    const ancestors = ancestorSectionIds(nodes, selected);
    setExpandedKeys((current) => {
      if (current.length === 0) {
        return [...new Set([...defaultExpanded, ...ancestors])];
      }
      return [...new Set([...current, ...ancestors])];
    });
  }, [model, sectionId]);

  const sectionOptions = useMemo(
    () =>
      treeNodes.map((node) => ({
        value: node.id,
        label: sectionLabel(node),
      })),
    [treeNodes],
  );

  const columns = useMemo<ColumnsType<BinderDocumentItem>>(
    () => [
      {
        title: displayText(chrome?.column_document, "Document"),
        dataIndex: "name",
        key: "name",
        render: (_value, row) => (
          <Link className="binder-tree-panel__doc-link" to={row.record_detail_href}>
            {row.document_number ? `${row.document_number} — ${row.name}` : row.name}
          </Link>
        ),
      },
      {
        title: displayText(chrome?.column_status, "Status"),
        dataIndex: "status_label",
        key: "status",
        width: 140,
        render: (value?: string) => value || "—",
      },
      {
        title: displayText(chrome?.column_filing_origin, "Filing Origin"),
        dataIndex: "filing_origin",
        key: "filing_origin",
        width: 140,
        render: (value?: string) => filingOriginLabel(chrome, value),
      },
      {
        title: displayText(chrome?.column_binding, "Binding"),
        dataIndex: "is_bound",
        key: "binding",
        width: 140,
        render: (_value, row) =>
          row.is_bound
            ? `${displayText(chrome?.bound_badge, "Bound")}${row.bound_version_label ? ` ${row.bound_version_label}` : ""}`
            : displayText(chrome?.binding_unbound, "Unbound"),
      },
    ],
    [chrome],
  );

  const onRefresh = async () => {
    if (!vaultId || !binderId) return;
    setRefreshing(true);
    try {
      const result = await api.refreshBinderAutofiling(vaultId, binderId);
      message.success(result.message || displayText(chrome?.refresh_queued, "Refresh Auto-Filing has been queued."));
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(chrome?.refresh_failed, "Failed to queue Refresh Auto-Filing"));
    } finally {
      setRefreshing(false);
    }
  };

  const openAddDocuments = useCallback((targetSectionId: string) => {
    setAddSectionId(targetSectionId);
    setAddDocumentId("");
    setAddOpen(true);
  }, []);

  const onAdd = async () => {
    if (!addSectionId || !addDocumentId) return;
    setMutating(true);
    try {
      await api.binderAddDocuments(vaultId, binderId, {
        section_id: addSectionId,
        document_ids: [addDocumentId],
      });
      setAddOpen(false);
      setAddDocumentId("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to add documents");
    } finally {
      setMutating(false);
    }
  };

  const onRemove = async () => {
    if (selectedRowKeys.length === 0) return;
    setMutating(true);
    try {
      await api.binderRemoveLinks(vaultId, binderId, { node_ids: selectedRowKeys });
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to remove links");
    } finally {
      setMutating(false);
    }
  };

  const onMove = async () => {
    if (!moveTarget || selectedRowKeys.length === 0) return;
    setMutating(true);
    try {
      for (const nodeId of selectedRowKeys) {
        await api.binderMoveLink(vaultId, binderId, {
          node_id: nodeId,
          target_section_id: moveTarget,
        });
      }
      setMoveOpen(false);
      setMoveTarget(undefined);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to move links");
    } finally {
      setMutating(false);
    }
  };

  const onReorder = async (direction: "up" | "down") => {
    if (!sectionId || selectedRowKeys.length !== 1) return;
    const docs = model?.documents ?? [];
    const selected = selectedRowKeys[0];
    const index = docs.findIndex((doc) => doc.node_id === selected);
    if (index < 0) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= docs.length) return;
    const selectedDoc = docs[index];
    const peerDoc = docs[swapWith];
    // Reorder only applies within one Section; skip when the list includes
    // rolled-up documents from descendant Sections.
    const reorderSection = selectedDoc.section_id || sectionId;
    if ((peerDoc.section_id || sectionId) !== reorderSection) return;
    const siblings = docs.filter((doc) => (doc.section_id || sectionId) === reorderSection);
    const siblingIds = siblings.map((doc) => doc.node_id);
    const localIndex = siblingIds.indexOf(selected);
    const localSwap = direction === "up" ? localIndex - 1 : localIndex + 1;
    if (localIndex < 0 || localSwap < 0 || localSwap >= siblingIds.length) return;
    const next = [...siblingIds];
    [next[localIndex], next[localSwap]] = [next[localSwap], next[localIndex]];
    setMutating(true);
    try {
      await api.binderReorderLinks(vaultId, binderId, {
        section_id: reorderSection,
        node_ids: next,
      });
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to reorder documents");
    } finally {
      setMutating(false);
    }
  };

  const onSyncStructure = async () => {
    setMutating(true);
    try {
      const result = await api.binderSyncStructure(vaultId, binderId);
      message.success(
        displayTextTemplate(
          chrome?.sync_structure_done,
          {
            created: String(result.sections_created ?? 0),
            removed: String(result.sections_removed ?? 0),
            deprecated: String(result.sections_deprecated ?? 0),
          },
          "Structure synced: {created} added, {removed} removed, {deprecated} deprecated.",
        ),
      );
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to sync structure");
    } finally {
      setMutating(false);
    }
  };

  const onCreateDocument = useCallback(
    (targetSectionId: string) => {
      navigate(
        buildCreateDocumentHref(
          binderId,
          model?.binder_name ?? "",
          targetSectionId,
          model?.context_defaults,
        ),
      );
    },
    [binderId, model?.binder_name, model?.context_defaults, navigate],
  );

  const openSetBinding = useCallback(
    async (target: BindingTarget) => {
      const single = target.scope === "document" && target.nodeIds.length === 1;
      setBindingTarget(target);
      setBindingMode(single ? "specific" : "latest_steady");
      setBindingOverwrite(false);
      setBindingVersionId(undefined);
      setVersionOptions([]);
      if (single) {
        const row = (model?.documents ?? []).find((doc) => doc.node_id === target.nodeIds[0]);
        if (row) {
          try {
            const result = await api.binderDocumentVersions(vaultId, binderId, row.record_id);
            setVersionOptions(
              (result.versions ?? []).map((version) => ({
                value: version.record_id,
                label: version.label + (version.is_steady ? " (steady)" : "") + (version.is_latest ? " (latest)" : ""),
              })),
            );
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Failed to load versions");
            return;
          }
        }
      }
      setBindingOpen(true);
    },
    [binderId, model?.documents, vaultId],
  );

  const onSetBinding = async () => {
    setMutating(true);
    try {
      const body: {
        scope: string;
        section_id?: string;
        node_ids?: string[];
        mode: string;
        version_id?: string;
        overwrite?: boolean;
      } = {
        scope: bindingTarget.scope,
        mode: bindingMode,
        overwrite: bindingMode === "unbound" ? true : bindingOverwrite,
      };
      if (bindingTarget.scope === "section" && bindingTarget.sectionId) {
        body.section_id = bindingTarget.sectionId;
      }
      if (bindingTarget.scope === "document") {
        body.node_ids = bindingTarget.nodeIds;
      }
      if (bindingMode === "specific") {
        body.version_id = bindingVersionId;
      }
      await api.binderSetBinding(vaultId, binderId, body);
      setBindingOpen(false);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to set binding");
    } finally {
      setMutating(false);
    }
  };

  const openCreateSection = useCallback((parentSectionId?: string) => {
    setSectionModalTargetId(parentSectionId);
    setSectionNumber("");
    setSectionName("");
    setSectionModal("create");
  }, []);

  const openRenameSection = useCallback(
    (targetSectionId: string) => {
      const node = nodeById.get(targetSectionId);
      setSectionModalTargetId(targetSectionId);
      setSectionNumber(node?.number ?? "");
      setSectionName(node?.name ?? "");
      setSectionModal("rename");
    },
    [nodeById],
  );

  const onSaveSection = async () => {
    if (!sectionName.trim()) return;
    setMutating(true);
    try {
      if (sectionModal === "create") {
        const result = await api.binderAddCustomSection(vaultId, binderId, {
          parent_section_id: sectionModalTargetId,
          number: sectionNumber,
          name: sectionName.trim(),
        });
        setHideEmpty(false);
        setSectionId(result.section_id);
        setSectionModal(null);
        await load();
      } else if (sectionModal === "rename" && sectionModalTargetId) {
        await api.binderRenameCustomSection(vaultId, binderId, sectionModalTargetId, {
          number: sectionNumber,
          name: sectionName.trim(),
        });
        setSectionModal(null);
        await load();
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setMutating(false);
    }
  };

  const onDeleteSection = useCallback(
    (targetSectionId: string) => {
      Modal.confirm({
        title: displayText(chrome?.delete_custom_section, "Delete Custom Section"),
        content: displayText(
          chrome?.delete_section_confirm,
          "Delete this Custom Section and all nested sections and document links? Documents themselves are not deleted.",
        ),
        okType: "danger",
        okText: displayText(chrome?.delete_custom_section, "Delete Custom Section"),
        cancelText: displayText(chrome?.cancel, "Cancel"),
        onOk: async () => {
          setMutating(true);
          try {
            await api.binderDeleteCustomSection(vaultId, binderId, targetSectionId);
            setSectionId(undefined);
            await load();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Failed to delete section");
          } finally {
            setMutating(false);
          }
        },
      });
    },
    [binderId, chrome, load, vaultId],
  );

  const sectionMenuItems = useCallback(
    (node: BinderTreeNode): MenuProps["items"] => {
      if (!canEdit) return [];
      const documents: MenuProps["items"] = [
        {
          key: "add",
          label: displayText(chrome?.add_documents, "Add Existing Documents"),
          onClick: () => openAddDocuments(node.id),
        },
        {
          key: "create-doc",
          label: displayText(chrome?.create_document, "Create Document in Section"),
          onClick: () => onCreateDocument(node.id),
        },
        {
          key: "binding",
          label: displayText(chrome?.set_binding, "Set Version Binding"),
          onClick: () => void openSetBinding({ scope: "section", sectionId: node.id, nodeIds: [] }),
        },
      ];
      const structure: MenuProps["items"] = canManageSections
        ? [
            {
              key: "create-section",
              label: displayText(chrome?.create_custom_section, "Create Custom Section"),
              onClick: () => openCreateSection(node.id),
            },
            {
              key: "rename-section",
              label: displayText(chrome?.rename_custom_section, "Rename Custom Section"),
              disabled: !node.is_custom,
              onClick: () => openRenameSection(node.id),
            },
            {
              key: "delete-section",
              label: displayText(chrome?.delete_custom_section, "Delete Custom Section"),
              danger: true,
              disabled: !node.is_custom || mutating,
              onClick: () => onDeleteSection(node.id),
            },
          ]
        : [];
      return menuGroups([
        { key: "documents", label: displayText(chrome?.menu_group_documents, "Documents"), children: documents },
        { key: "structure", label: displayText(chrome?.menu_group_structure, "Structure"), children: structure },
      ]);
    },
    [
      canEdit,
      canManageSections,
      chrome,
      mutating,
      onCreateDocument,
      onDeleteSection,
      openAddDocuments,
      openCreateSection,
      openRenameSection,
      openSetBinding,
    ],
  );

  const treeData = useMemo<DataNode[]>(() => {
    if (treeNodes.length === 0) return [];
    const byParent = new Map<string | undefined, BinderTreeNode[]>();
    for (const node of treeNodes) {
      const key = node.parent_id || undefined;
      const list = byParent.get(key) ?? [];
      list.push(node);
      byParent.set(key, list);
    }
    const walk = (parent?: string): DataNode[] =>
      (byParent.get(parent) ?? []).map((node) => ({
        key: node.id,
        title: (
          <Dropdown
            menu={{ items: sectionMenuItems(node) }}
            trigger={["contextMenu"]}
            disabled={!canEdit}
            onOpenChange={(open) => {
              if (open) setSectionId(node.id);
            }}
          >
            <span>
              {sectionLabel(node)}
              {node.is_deprecated ? (
                <span className="binder-tree-panel__deprecated">
                  {" "}
                  ({displayText(chrome?.deprecated_badge, "Deprecated")})
                </span>
              ) : null}
              {node.document_count > 0 ? (
                <span className="binder-tree-panel__tree-count"> ({node.document_count})</span>
              ) : null}
            </span>
          </Dropdown>
        ),
        children: walk(node.id),
        isLeaf: !node.has_children,
      }));
    return walk(undefined);
  }, [treeNodes, chrome, canEdit, sectionMenuItems]);

  const buildActionMenuItems = (): MenuProps["items"] => {
    if (!showActions) return [];
    const docs = model?.documents ?? [];
    const documentCount = docs.length;
    const selectedIndex = docs.findIndex((doc) => doc.node_id === selectedRowKeys[0]) ?? -1;
    const singleSelected = selectedRowKeys.length === 1;
    const selectedDoc = selectedIndex >= 0 ? docs[selectedIndex] : undefined;
    const reorderSection = selectedDoc?.section_id || sectionId;
    const peerUp = selectedIndex > 0 ? docs[selectedIndex - 1] : undefined;
    const peerDown = selectedIndex >= 0 && selectedIndex < documentCount - 1 ? docs[selectedIndex + 1] : undefined;
    const canMoveUp =
      canEdit &&
      singleSelected &&
      !mutating &&
      !!peerUp &&
      (peerUp.section_id || sectionId) === reorderSection;
    const canMoveDown =
      canEdit &&
      singleSelected &&
      !mutating &&
      !!peerDown &&
      (peerDown.section_id || sectionId) === reorderSection;
    const documents: MenuProps["items"] = canEdit
      ? [
          {
            key: "add",
            label: displayText(chrome?.add_documents, "Add Existing Documents"),
            disabled: !sectionId,
            onClick: () => sectionId && openAddDocuments(sectionId),
          },
          {
            key: "create-doc",
            label: displayText(chrome?.create_document, "Create Document in Section"),
            disabled: !sectionId,
            onClick: () => sectionId && onCreateDocument(sectionId),
          },
          {
            key: "move",
            label: displayText(chrome?.move_documents, "Move to Section"),
            disabled: selectedRowKeys.length === 0 || mutating,
            onClick: () => {
              setMoveTarget(undefined);
              setMoveOpen(true);
            },
          },
          {
            key: "move-up",
            label: displayText(chrome?.move_up, "Move Up"),
            disabled: !canMoveUp,
            onClick: () => void onReorder("up"),
          },
          {
            key: "move-down",
            label: displayText(chrome?.move_down, "Move Down"),
            disabled: !canMoveDown,
            onClick: () => void onReorder("down"),
          },
          {
            key: "remove",
            label: displayText(chrome?.remove_documents, "Remove from Binder"),
            danger: true,
            disabled: selectedRowKeys.length === 0 || mutating,
            onClick: () => void onRemove(),
          },
        ]
      : [];
    const binding: MenuProps["items"] = canEdit
      ? [
          {
            key: "binding-binder",
            label: displayText(chrome?.set_binding_binder, "Entire Binder"),
            onClick: () => void openSetBinding({ scope: "binder", nodeIds: [] }),
          },
          {
            key: "binding-section",
            label: displayText(chrome?.set_binding_section, "Selected Section"),
            disabled: !sectionId,
            onClick: () => sectionId && void openSetBinding({ scope: "section", sectionId, nodeIds: [] }),
          },
          {
            key: "binding-docs",
            label: displayText(chrome?.set_binding_documents, "Selected Documents"),
            disabled: selectedRowKeys.length === 0,
            onClick: () => void openSetBinding({ scope: "document", nodeIds: selectedRowKeys }),
          },
        ]
      : [];
    const structure: MenuProps["items"] = [
      ...(canEdit && canManageSections
        ? [
            {
              key: "create-section",
              label: displayText(chrome?.create_custom_section, "Create Custom Section"),
              onClick: () => openCreateSection(sectionId),
            },
            {
              key: "rename-section",
              label: displayText(chrome?.rename_custom_section, "Rename Custom Section"),
              disabled: !selectedIsCustom,
              onClick: () => sectionId && openRenameSection(sectionId),
            },
            {
              key: "delete-section",
              label: displayText(chrome?.delete_custom_section, "Delete Custom Section"),
              danger: true,
              disabled: !selectedIsCustom || mutating,
              onClick: () => sectionId && onDeleteSection(sectionId),
            },
          ]
        : []),
      ...(canEdit
        ? [
            {
              key: "sync-structure",
              label: displayText(chrome?.sync_structure, "Sync Structure from Model"),
              disabled: mutating,
              onClick: () => void onSyncStructure(),
            },
          ]
        : []),
      ...(canRefresh
        ? [
            {
              key: "refresh-autofiling",
              label: displayText(chrome?.refresh_autofiling, "Refresh Auto-Filing"),
              disabled: refreshing,
              onClick: () => void onRefresh(),
            },
          ]
        : []),
    ];
    return menuGroups([
      { key: "documents", label: displayText(chrome?.menu_group_documents, "Documents"), children: documents },
      { key: "binding", label: displayText(chrome?.menu_group_binding, "Version Binding"), children: binding },
      { key: "structure", label: displayText(chrome?.menu_group_structure, "Structure"), children: structure },
    ]);
  };

  const allKeys = useMemo(() => treeNodes.map((node) => node.id), [treeNodes]);

  return (
    <div className="binder-tree-panel">
      <div className="binder-tree-panel__toolbar">
        <Checkbox checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)}>
          {displayText(chrome?.hide_empty_sections, "Hide empty sections")}
        </Checkbox>
        <Select
          className="binder-tree-panel__origin-filter"
          value={filingOrigin}
          onChange={setFilingOrigin}
          options={[
            { value: "all", label: displayText(chrome?.filing_origin_all, "All") },
            { value: "auto", label: displayText(chrome?.filing_origin_auto, "Auto-filed") },
            { value: "manual", label: displayText(chrome?.filing_origin_manual, "Manually filed") },
          ]}
          aria-label={displayText(chrome?.filter_filing_origin, "Filing origin")}
        />
        <Select
          className="binder-tree-panel__origin-filter"
          value={bindingFilter}
          onChange={setBindingFilter}
          options={[
            { value: "all", label: displayText(chrome?.binding_all, "All") },
            { value: "bound", label: displayText(chrome?.binding_bound, "Bound") },
            { value: "unbound", label: displayText(chrome?.binding_unbound, "Unbound") },
          ]}
          aria-label={displayText(chrome?.filter_binding, "Version binding")}
        />
        {showActions ? (
          <Dropdown
            className="binder-tree-panel__actions"
            menu={{ items: buildActionMenuItems() }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button loading={mutating || refreshing}>
              {displayText(chrome?.actions_menu, "Actions")} <DownOutlined aria-hidden="true" />
            </Button>
          </Dropdown>
        ) : null}
      </div>

      {error ? <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} /> : null}

      {loading && !model ? (
        <div className="binder-tree-panel__loading">
          <Spin />
        </div>
      ) : (
        <div className="binder-tree-panel__body">
          <div className="binder-tree-panel__tree-panel">
            <div className="binder-tree-panel__tree-toolbar">
              <span className="binder-tree-panel__tree-title">
                {displayTextTemplate(
                  chrome?.documents_count,
                  { count: model?.total_document_count ?? 0 },
                  "{count} documents",
                )}
              </span>
              <div>
                <button type="button" className="binder-tree-panel__tree-action" onClick={() => setExpandedKeys(allKeys)}>
                  {displayText(chrome?.expand_all, "Expand All")}
                </button>
                <button type="button" className="binder-tree-panel__tree-action" onClick={() => setExpandedKeys([])}>
                  {displayText(chrome?.collapse_all, "Collapse All")}
                </button>
              </div>
            </div>
            {treeData.length === 0 ? (
              <div className="binder-tree-panel__empty">
                {hideEmpty && totalSectionCount > 0 ? (
                  <>
                    <p className="binder-tree-panel__empty-text">
                      {displayTextTemplate(
                        chrome?.empty_tree_all_hidden,
                        { count: totalSectionCount },
                        "All {count} sections of this Binder are empty and hidden by the current filter.",
                      )}
                    </p>
                    <Button type="link" size="small" onClick={() => setHideEmpty(false)}>
                      {displayText(chrome?.show_all_sections, "Show all sections")}
                    </Button>
                  </>
                ) : (
                  displayText(chrome?.empty_tree, "No sections in this Binder yet.")
                )}
              </div>
            ) : (
              <Tree
                treeData={treeData}
                selectedKeys={sectionId ? [sectionId] : []}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys.map(String))}
                onSelect={(keys) => {
                  const next = keys[0] ? String(keys[0]) : undefined;
                  if (next) setSectionId(next);
                }}
              />
            )}
          </div>
          <div className="binder-tree-panel__list-panel">
            <div className="binder-tree-panel__list-header">
              <span className="binder-tree-panel__list-title">
                {displayText(chrome?.documents_title, "Documents")}
              </span>
              {selectedNode ? (
                <span className="binder-tree-panel__list-section">{sectionLabel(selectedNode)}</span>
              ) : null}
            </div>
            <Table
              size="small"
              rowKey="node_id"
              columns={columns}
              dataSource={model?.documents ?? []}
              pagination={false}
              rowSelection={
                canEdit
                  ? {
                      selectedRowKeys,
                      onChange: (keys) => setSelectedRowKeys(keys.map(String)),
                    }
                  : undefined
              }
              locale={{
                emptyText: displayText(chrome?.empty_documents, "No documents in this section."),
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      <Modal
        open={addOpen}
        title={displayText(chrome?.add_documents_title, "Add documents to section")}
        onCancel={() => {
          setAddOpen(false);
          setAddDocumentId("");
        }}
        onOk={() => void onAdd()}
        okText={displayText(chrome?.save, "Save")}
        cancelText={displayText(chrome?.cancel, "Cancel")}
        confirmLoading={mutating}
        okButtonProps={{ disabled: !addDocumentId }}
        destroyOnClose
      >
        <ObjectReferenceInput
          vaultId={vaultId}
          targetObject="document__v"
          value={addDocumentId}
          onChange={setAddDocumentId}
          label={displayText(chrome?.document_field, "Document")}
        />
      </Modal>

      <Modal
        open={moveOpen}
        title={displayText(chrome?.move_documents_title, "Move documents to another section")}
        onCancel={() => {
          setMoveOpen(false);
          setMoveTarget(undefined);
        }}
        onOk={() => void onMove()}
        okText={displayText(chrome?.save, "Save")}
        cancelText={displayText(chrome?.cancel, "Cancel")}
        confirmLoading={mutating}
        okButtonProps={{ disabled: !moveTarget }}
        destroyOnClose
      >
        <Select
          className="binder-tree-panel__move-target"
          showSearch
          optionFilterProp="label"
          placeholder={displayText(chrome?.target_section, "Target section")}
          value={moveTarget}
          onChange={setMoveTarget}
          options={sectionOptions.filter((opt) => opt.value !== sectionId)}
        />
      </Modal>

      <Modal
        open={sectionModal !== null}
        title={
          sectionModal === "rename"
            ? displayText(chrome?.rename_custom_section, "Rename Custom Section")
            : displayText(chrome?.create_custom_section, "Create Custom Section")
        }
        onCancel={() => setSectionModal(null)}
        onOk={() => void onSaveSection()}
        okText={displayText(chrome?.save, "Save")}
        cancelText={displayText(chrome?.cancel, "Cancel")}
        confirmLoading={mutating}
        okButtonProps={{ disabled: !sectionName.trim() }}
        destroyOnClose
      >
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            {displayText(chrome?.section_number_field, "Number")}
            <Input value={sectionNumber} onChange={(e) => setSectionNumber(e.target.value)} />
          </label>
          <label>
            {displayText(chrome?.section_name_field, "Name")}
            <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
          </label>
        </div>
      </Modal>

      <Modal
        open={bindingOpen}
        title={displayText(chrome?.set_binding_title, "Set Version Binding")}
        onCancel={() => setBindingOpen(false)}
        onOk={() => void onSetBinding()}
        okText={displayText(chrome?.save, "Save")}
        cancelText={displayText(chrome?.cancel, "Cancel")}
        confirmLoading={mutating}
        okButtonProps={{
          disabled: bindingMode === "specific" && !bindingVersionId,
        }}
        destroyOnClose
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Select
            value={bindingMode}
            onChange={(value) => {
              setBindingMode(value);
              if (value === "unbound") setBindingOverwrite(true);
            }}
            options={[
              { value: "unbound", label: displayText(chrome?.binding_mode_unbound, "Unbound") },
              { value: "latest_steady", label: displayText(chrome?.binding_mode_steady, "Latest Steady State Version") },
              { value: "latest", label: displayText(chrome?.binding_mode_latest, "Latest Version") },
              ...(bindingTarget.scope === "document" && bindingTarget.nodeIds.length === 1
                ? [{ value: "specific", label: displayText(chrome?.binding_mode_specific, "Specific Version") }]
                : []),
            ]}
          />
          {bindingMode === "specific" && bindingTarget.nodeIds.length === 1 ? (
            <Select
              placeholder={displayText(chrome?.binding_version_field, "Version")}
              value={bindingVersionId}
              onChange={setBindingVersionId}
              options={versionOptions}
            />
          ) : null}
          <Checkbox
            checked={bindingMode === "unbound" ? true : bindingOverwrite}
            disabled={bindingMode === "unbound"}
            onChange={(e) => setBindingOverwrite(e.target.checked)}
          >
            {displayText(
              chrome?.binding_overwrite,
              "Overwrite existing bindings if a newer version is available",
            )}
          </Checkbox>
        </div>
      </Modal>
    </div>
  );
}
