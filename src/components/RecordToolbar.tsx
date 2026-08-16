import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { CaretDownOutlined, EditOutlined, EllipsisOutlined } from "@ant-design/icons";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LifecycleAction, RecordPageModel, SdkAction } from "../api/types";
import { defaultPageActionLabels, displayText } from "../lib/i18n";
import type { RecordNavState } from "../lib/vaultNav";
import { partitionLifecycleToolbarActions } from "./record/lifecycleToolbarActions";
import { WorkflowStateChangeIcon } from "./record/WorkflowStateChangeIcon";
import { recordActionIcon } from "./record/recordActionIcon";
import { buildRecordDetailHref, documentPageShellQuery } from "../lib/recordPageShell";
import { isDocumentToolbarAction } from "../lib/documentActions";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  page: RecordPageModel;
  layout: string | undefined;
  pageApiName?: string;
  isDocumentObject?: boolean;
  isDocumentSplit?: boolean;
  /** Binder tree shell (node tree + metadata), distinct from document viewer. */
  isBinderTree?: boolean;
  /** Binder object type on either tree or object-record shell. */
  isBinderRecord?: boolean;
  tabApiName?: string;
  tabLabel?: string;
  recordDisplayName?: string;
  recordIndex?: number;
  recordTotal?: number;
  pageRecordIds?: string[];
  onLifecycleAction: (action: LifecycleAction) => void;
  onSdkAction?: (action: SdkAction) => void;
  onEdit?: () => void;
  editing?: boolean;
  /** Hides workflow, edit, and overflow menus (list nav lives in RecordListNav). */
  editMode?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  onChangeType?: () => void;
  lifecyclePending?: boolean;
  onAuditOpen?: () => void;
};

type MenuSection = {
  key: string;
  label: string;
  children: MenuProps["items"];
};

function lifecycleMenuItems(
  actions: LifecycleAction[],
  lifecyclePending: boolean | undefined,
  onLifecycleAction: (action: LifecycleAction) => void,
): MenuProps["items"] {
  return actions.map((action) => ({
    key: action.name,
    label: displayText(action.label, action.name),
    icon: recordActionIcon(
      action.name,
      typeof action.label === "string" ? action.label : action.label?.text,
    ),
    disabled: lifecyclePending,
    onClick: () => onLifecycleAction(action),
  }));
}

function buildGroupedMenuSections(sections: MenuSection[]): MenuProps["items"] {
  return sections
    .filter((section) => section.children.length > 0)
    .map((section) => ({
      key: section.key,
      type: "group" as const,
      label: section.label,
      children: section.children,
    }));
}

function renderToolbarMenuPanel(menu: ReactNode, extraClassName?: string) {
  const className = ["dropdown__panel", "record-toolbar__menu-panel", extraClassName]
    .filter(Boolean)
    .join(" ");
  return <div className={className}>{menu}</div>;
}

export function RecordToolbar({
  vaultId: _vaultId,
  objectName,
  recordId,
  page,
  layout,
  pageApiName,
  isDocumentObject = false,
  isDocumentSplit = false,
  isBinderTree = false,
  isBinderRecord = false,
  tabApiName,
  tabLabel,
  recordDisplayName,
  recordIndex,
  recordTotal,
  pageRecordIds,
  onLifecycleAction,
  onSdkAction,
  onEdit,
  editing,
  editMode = false,
  onDelete,
  deleting,
  onChangeType,
  lifecyclePending,
  onAuditOpen,
}: Props) {
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  const labels = { ...defaultPageActionLabels, ...(page.actions.labels ?? {}) };
  const copyParams = new URLSearchParams();
  if (layout) copyParams.set("layout", layout);
  if (tabApiName) copyParams.set("tab", tabApiName);
  if (pageApiName) copyParams.set("page", pageApiName);
  copyParams.set("copy_from", recordId);
  const copySuffix = copyParams.toString() ? `?${copyParams}` : "";
  const editParams = new URLSearchParams();
  if (layout) editParams.set("layout", layout);
  if (tabApiName) editParams.set("tab", tabApiName);
  if (pageApiName) editParams.set("page", pageApiName);
  const editSuffix = editParams.toString() ? `?${editParams}` : "";
  const editHref = `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/edit${editSuffix}`;
  const copyHref = `/objects/${encodeURIComponent(objectName)}/create${copySuffix}`;
  const auditParams = new URLSearchParams();
  if (layout) auditParams.set("layout", layout);
  if (tabApiName) auditParams.set("tab", tabApiName);
  if (pageApiName) auditParams.set("page", pageApiName);
  const auditSuffix = auditParams.toString() ? `?${auditParams}` : "";
  const auditHref = `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/audit${auditSuffix}`;

  const { startWorkflow, changeState, allActionsMenu } = useMemo(
    () => partitionLifecycleToolbarActions(page.lifecycle_actions ?? []),
    [page.lifecycle_actions],
  );

  const showEditButton = page.actions.edit_allowed;
  const menuEditItems: Array<
    | { kind: "link"; label: string; to: string; chromeKind?: string }
    | {
        kind: "button";
        label: string;
        onClick: () => void;
        disabled?: boolean;
        danger?: boolean;
        chromeKind?: string;
      }
  > = [];

  if (page.actions.copy_allowed) {
    menuEditItems.push({
      kind: "link",
      label: displayText(labels.copy),
      to: copyHref,
      chromeKind: "copy",
    });
  }
  if (page.actions.delete_allowed && onDelete) {
    menuEditItems.push({
      kind: "button",
      label: deleting ? displayText(labels.deleting) : displayText(labels.delete),
      onClick: onDelete,
      disabled: deleting,
      danger: true,
      chromeKind: "delete",
    });
  }
  const viewItems: Array<
    | {
        kind: "link";
        label: string;
        to: string;
        state?: RecordNavState;
        chromeKind?: string;
      }
    | { kind: "button"; label: string; onClick: () => void; chromeKind?: string }
  > = [];
  const manageItems: Array<{
    kind: "button";
    label: string;
    onClick: () => void;
    disabled?: boolean;
    name?: string;
    chromeKind?: string;
  }> = [];

  if (page.actions.change_type?.allowed && onChangeType) {
    manageItems.push({
      kind: "button",
      label: displayText(page.actions.change_type.labels.action, "Change Type"),
      onClick: onChangeType,
      disabled: lifecyclePending,
      chromeKind: "change_type",
    });
  }

  for (const action of allActionsMenu) {
    manageItems.push({
      kind: "button",
      label: displayText(action.label, action.name),
      onClick: () => onLifecycleAction(action),
      disabled: lifecyclePending,
      name: action.name,
    });
  }
  for (const action of page.sdk_actions ?? []) {
    if (isDocumentSplit && isDocumentToolbarAction(action.name)) {
      continue;
    }
    manageItems.push({
      kind: "button",
      label: displayText(action.label, action.name),
      onClick: () => onSdkAction?.(action),
      disabled: lifecyclePending || !onSdkAction,
      name: action.name,
    });
  }
  if (page.audit.visible) {
    if (onAuditOpen) {
      viewItems.push({
        kind: "button",
        label: displayText(labels.audit),
        onClick: onAuditOpen,
        chromeKind: "audit",
      });
    } else {
      viewItems.push({
        kind: "link",
        label: displayText(labels.audit),
        to: auditHref,
        chromeKind: "audit",
        state: {
          tabApiName,
          tabLabel,
          objectLabel: displayText(page.object_label, page.object_api_name),
          recordDisplayName,
        },
      });
    }
  }
  const documentShellNav =
    (isDocumentObject || isBinderRecord) && !editMode
      ? (() => {
          const onSpecialtyShell = isDocumentSplit || isBinderTree;
          const label = onSpecialtyShell
            ? displayText(labels.view_object_record, "Object Record")
            : isBinderRecord
              ? displayText(labels.view_binder, "View Binder")
              : displayText(labels.view_document, "View Document");
          const chromeKind = onSpecialtyShell
            ? "object_record"
            : isBinderRecord
              ? "view_binder"
              : "view_document";
          return {
            label,
            to: buildRecordDetailHref(
              objectName,
              recordId,
              documentPageShellQuery(layout, tabApiName, pageApiName),
            ),
            chromeKind,
            state: {
              tabApiName,
              tabLabel,
              objectLabel: displayText(page.object_label, page.object_api_name),
              recordDisplayName,
              recordIndex,
              recordTotal,
              pageRecordIds,
            } satisfies RecordNavState,
          };
        })()
      : null;

  if (documentShellNav) {
    viewItems.push({
      kind: "link",
      label: documentShellNav.label,
      to: documentShellNav.to,
      state: documentShellNav.state,
      chromeKind: documentShellNav.chromeKind,
    });
  }

  const workflowStateMenuItems = buildGroupedMenuSections([
    {
      key: "start-workflow-heading",
      label: displayText(labels.menu_group_start_workflow),
      children: lifecycleMenuItems(startWorkflow, lifecyclePending, onLifecycleAction),
    },
    {
      key: "change-state-heading",
      label: displayText(labels.menu_group_change_state),
      children: lifecycleMenuItems(changeState, lifecyclePending, onLifecycleAction),
    },
  ]);

  const showWorkflowStateMenu =
    !editMode && (startWorkflow.length > 0 || changeState.length > 0);
  const hasMenu =
    !editMode && (menuEditItems.length > 0 || viewItems.length > 0 || manageItems.length > 0);
  const showDocumentShellShortcut = Boolean(documentShellNav);

  if (
    editMode ||
    (!showEditButton && !hasMenu && !showWorkflowStateMenu && !showDocumentShellShortcut)
  ) {
    return null;
  }

  const workflowStateLabel = displayText(labels.workflow_and_state_change);

  const menuItems = buildGroupedMenuSections([
    {
      key: "manage-heading",
      label: displayText(labels.menu_group_manage),
      children: manageItems.map((action, index) => ({
        key: `manage-${index}`,
        label: action.label,
        icon: recordActionIcon(action.name ?? "", action.label, action.chromeKind),
        disabled: action.disabled,
        onClick: action.onClick,
      })),
    },
    {
      key: "edit-heading",
      label: displayText(labels.menu_group_edit),
      children: menuEditItems.map((action, index) => {
        if (action.kind === "link") {
          return {
            key: `edit-link-${index}`,
            label: <Link to={action.to}>{action.label}</Link>,
            icon: recordActionIcon("", action.label, action.chromeKind),
          };
        }
        return {
          key: `edit-btn-${index}`,
          label: action.label,
          icon: recordActionIcon("", action.label, action.chromeKind),
          disabled: action.disabled,
          danger: action.danger,
          onClick: action.onClick,
        };
      }),
    },
    {
      key: "view-heading",
      label: displayText(labels.menu_group_view),
      children: viewItems.map((action, index) => {
        if (action.kind === "link") {
          return {
            key: `view-${index}`,
            label: <Link to={action.to} state={action.state}>{action.label}</Link>,
            icon: recordActionIcon("", action.label, action.chromeKind),
          };
        }
        return {
          key: `view-${index}`,
          label: action.label,
          icon: recordActionIcon("", action.label, action.chromeKind),
          onClick: action.onClick,
        };
      }),
    },
  ]);

  return (
    <div className="record-toolbar">
      {showWorkflowStateMenu && (
        <Dropdown
          menu={{ items: workflowStateMenuItems }}
          trigger={["click"]}
          placement="bottomRight"
          open={workflowMenuOpen}
          onOpenChange={setWorkflowMenuOpen}
          popupRender={(menu) => renderToolbarMenuPanel(menu, "record-toolbar__workflow-state-panel")}
        >
          <Button
            size="small"
            className={[
              "record-toolbar__workflow-state",
              workflowMenuOpen ? "record-toolbar__workflow-state--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={workflowStateLabel}
            aria-expanded={workflowMenuOpen}
            aria-haspopup="menu"
            title={workflowStateLabel}
            disabled={lifecyclePending}
          >
            <span className="record-toolbar__workflow-state-content">
              <WorkflowStateChangeIcon className="record-toolbar__workflow-state-icon" />
              <CaretDownOutlined className="record-toolbar__menu-caret" aria-hidden="true" />
            </span>
          </Button>
        </Dropdown>
      )}
      {showEditButton &&
        (onEdit ? (
          <Button
            size="small"
            className="record-toolbar__edit"
            aria-label={displayText(labels.edit)}
            title={displayText(labels.edit)}
            disabled={editing}
            onClick={onEdit}
          >
            <EditOutlined aria-hidden="true" />
          </Button>
        ) : (
          <Link to={editHref} className="record-toolbar__edit">
            <Button
              size="small"
              aria-label={displayText(labels.edit)}
              title={displayText(labels.edit)}
            >
              <EditOutlined aria-hidden="true" />
            </Button>
          </Link>
        ))}
      {documentShellNav ? (
        <Link
          to={documentShellNav.to}
          state={documentShellNav.state}
          className="record-toolbar__primary"
          aria-label={documentShellNav.label}
          title={documentShellNav.label}
        >
          <Button size="small" aria-label={documentShellNav.label} title={documentShellNav.label}>
            {recordActionIcon("", documentShellNav.label, documentShellNav.chromeKind)}
          </Button>
        </Link>
      ) : null}
      {hasMenu && (
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
          placement="bottomRight"
          popupRender={(menu) => renderToolbarMenuPanel(menu)}
        >
          <Button
            size="small"
            className="record-toolbar__menu-trigger"
            aria-label={displayText(labels.all_actions)}
            title={displayText(labels.all_actions)}
          >
            <EllipsisOutlined aria-hidden="true" />
          </Button>
        </Dropdown>
      )}
    </div>
  );
}
