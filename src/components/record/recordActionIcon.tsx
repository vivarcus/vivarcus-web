import type { ReactNode } from "react";
import {
  AuditOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  EditOutlined,
  FileAddOutlined,
  FileOutlined,
  FilePdfOutlined,
  FormOutlined,
  ImportOutlined,
  LinkOutlined,
  LockOutlined,
  PlusOutlined,
  SwapOutlined,
  SyncOutlined,
  UnlockOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { lifecycleActionIcon } from "./lifecycleActionIcon";

const iconA11y = { "aria-hidden": true as const };

/** Icons for document SDK / toolbar actions (shared by viewer strip and All Actions). */
export function documentActionIcon(name: string): ReactNode | undefined {
  switch (name) {
    case "download_source__v":
      return <DownloadOutlined {...iconA11y} />;
    case "download_rendition__v":
      return <FilePdfOutlined {...iconA11y} />;
    case "checkout__v":
      return <LockOutlined {...iconA11y} />;
    case "undo_checkout__v":
      return <UnlockOutlined {...iconA11y} />;
    case "checkin__v":
      return <ImportOutlined {...iconA11y} />;
    case "upload_new_version__v":
      return <CloudUploadOutlined {...iconA11y} />;
    case "create_draft__v":
      return <FileAddOutlined {...iconA11y} />;
    case "external_edit":
      return <FormOutlined {...iconA11y} />;
    case "feishu_resync":
      return <SyncOutlined {...iconA11y} />;
    case "feishu_import":
      return <UploadOutlined {...iconA11y} />;
    default:
      return undefined;
  }
}

/** Icons for chrome / All Actions menu entries (copy, delete, audit, …). */
export function chromeActionIcon(kind: string): ReactNode | undefined {
  switch (kind) {
    case "copy":
      return <CopyOutlined {...iconA11y} />;
    case "edit":
      return <EditOutlined {...iconA11y} />;
    case "delete":
      return <DeleteOutlined {...iconA11y} />;
    case "unlink":
      return <DisconnectOutlined {...iconA11y} />;
    case "audit":
      return <AuditOutlined {...iconA11y} />;
    case "change_type":
      return <SwapOutlined {...iconA11y} />;
    case "view_document":
      return <FileOutlined {...iconA11y} />;
    case "view_binder":
      return <FileOutlined {...iconA11y} />;
    case "object_record":
      return <FormOutlined {...iconA11y} />;
    case "add_to_cart":
      return <PlusOutlined {...iconA11y} />;
    case "send_as_link":
      return <LinkOutlined {...iconA11y} />;
    default:
      return undefined;
  }
}

/**
 * Resolve an icon for a record / document action menu item.
 * Prefers document SDK glyphs, then chrome kinds, then lifecycle name heuristics.
 */
export function recordActionIcon(
  name: string,
  label?: string,
  chromeKind?: string,
): ReactNode | undefined {
  if (chromeKind) {
    const chrome = chromeActionIcon(chromeKind);
    if (chrome) {
      return chrome;
    }
  }
  const documentIcon = documentActionIcon(name);
  if (documentIcon) {
    return documentIcon;
  }
  return lifecycleActionIcon(name, label);
}
