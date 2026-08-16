import type { ReactNode } from "react";
import type { DocumentUploadRequest } from "../../hooks/useRecordLifecycleActions";
import type { PageShellDescriptor, SdkAction } from "../../api/types";
import { BinderTreePanel } from "../binder/BinderTreePanel";
import { DocumentViewerPanel } from "./DocumentViewerPanel";

type Props = {
  shell?: PageShellDescriptor | null;
  vaultId: string;
  objectApiName: string;
  recordId?: string;
  isDocumentObject?: boolean;
  documentUploadRequest?: DocumentUploadRequest | null;
  onDocumentUploadComplete?: (
    action: SdkAction,
    target: DocumentUploadRequest["target"],
  ) => Promise<void>;
  onDocumentUploadHandled?: () => void;
  documentActions?: SdkAction[];
  onDocumentAction?: (action: SdkAction) => void;
  documentActionPending?: boolean;
  viewerRefreshKey?: string;
  onRecordPageReload?: () => Promise<void>;
  focusPageRequest?: { page: number; token: number; query?: string } | null;
  children: ReactNode;
};

export function ObjectRecordPageShell({
  shell,
  vaultId,
  objectApiName,
  recordId,
  isDocumentObject = false,
  documentUploadRequest,
  onDocumentUploadComplete,
  onDocumentUploadHandled,
  documentActions,
  onDocumentAction,
  documentActionPending,
  viewerRefreshKey,
  onRecordPageReload,
  focusPageRequest = null,
  children,
}: Props) {
  const documentPanelProps = {
    vaultId,
    objectApiName,
    recordId,
    documentUploadRequest,
    onDocumentUploadComplete,
    onDocumentUploadHandled,
    documentActions,
    onDocumentAction,
    documentActionPending,
    viewerRefreshKey,
    onRecordPageReload,
    focusPageRequest,
  };

  if (shell?.kind === "binder_tree" && recordId) {
    return (
      <div className="binder-page__split">
        <BinderTreePanel vaultId={vaultId} binderId={recordId} readonly={false} />
        <div className="binder-page__meta">{children}</div>
      </div>
    );
  }

  if (shell?.kind === "document_split") {
    return (
      <div className="document-page__split">
        <DocumentViewerPanel {...documentPanelProps} />
        <div className="document-page__fields">{children}</div>
      </div>
    );
  }

  // Document objects still host upload/check-in/create-draft dialogs from All Actions.
  if (isDocumentObject) {
    return (
      <>
        <DocumentViewerPanel {...documentPanelProps} modalHostOnly />
        {children}
      </>
    );
  }

  return <>{children}</>;
}
