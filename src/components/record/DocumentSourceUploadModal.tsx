import { Button, Input, Modal, Spin, Tooltip } from "antd";
import {
  CloudUploadOutlined,
  CopyOutlined,
  FileOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { FeishuImportAvailability } from "../../api/types";
import { FeishuImportModal } from "./FeishuImportModal";
import { displayText, displayTextTemplate } from "../../lib/i18n";
import { defaultDocumentViewerChrome, defaultShellChrome } from "../../lib/i18n/chromeTypes";
import { useUi } from "../../context/UiContext";
import "../../styles/components/document-source-upload-modal.css";

const VERSION_DESCRIPTION_MAX = 1500;

export type LocalSourceSelection = {
  kind: "local";
  file: File;
};

export type FeishuSourceSelection = {
  kind: "feishu";
  file_token: string;
  file_type: string;
  title: string;
  url: string;
};

export type CopySourceSelection = {
  kind: "copy";
};

export type DocumentSourceSelection = LocalSourceSelection | FeishuSourceSelection;
export type DocumentCreateDraftSelection = CopySourceSelection | DocumentSourceSelection;

export type DocumentSourceUploadModalVariant = "source_upload" | "create_draft";

type Props = {
  open: boolean;
  title: string;
  documentName: string;
  stateLabel?: string;
  /** Current document version tuple for create_draft copy label, e.g. 1.1 */
  currentVersionLabel?: string;
  vaultId: string;
  feishuAvailability: FeishuImportAvailability | null;
  submitting?: boolean;
  confirmLabel?: string;
  variant?: DocumentSourceUploadModalVariant;
  /** When true on open, immediately show the Feishu picker (e.g. after OAuth return). */
  autoOpenFeishu?: boolean;
  /** Called just before the Feishu picker opens (e.g. stash OAuth resume context). */
  onFeishuPickerOpen?: () => void;
  onCancel: () => void;
  onConfirm: (selection: DocumentSourceSelection) => Promise<void>;
  onCreateDraftConfirm?: (selection: DocumentCreateDraftSelection) => Promise<void>;
};

function selectionLabel(
  selection: DocumentSourceSelection | null,
  chrome: typeof defaultDocumentViewerChrome,
  opts?: { variant: DocumentSourceUploadModalVariant; currentVersionLabel?: string },
): string {
  if (opts?.variant === "create_draft" && (!selection || selection.kind === "copy")) {
    const version = opts.currentVersionLabel?.trim();
    return version
      ? displayTextTemplate(chrome.copying_from_current_version_n, { version })
      : displayText(chrome.copying_from_current_version);
  }
  if (!selection) {
    return displayText(chrome.no_file_selected_yet);
  }
  if (selection.kind === "local") {
    return selection.file.name;
  }
  return selection.title || displayText(chrome.feishu_document);
}

export function DocumentSourceUploadModal({
  open,
  title,
  documentName,
  stateLabel,
  currentVersionLabel,
  vaultId,
  feishuAvailability,
  submitting = false,
  confirmLabel,
  variant = "source_upload",
  autoOpenFeishu = false,
  onFeishuPickerOpen,
  onCancel,
  onConfirm,
  onCreateDraftConfirm,
}: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultDocumentViewerChrome, ...shell.document_viewer };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<DocumentSourceSelection | null>(null);
  const [createDraftMode, setCreateDraftMode] = useState<"copy" | "upload">("copy");
  const [description, setDescription] = useState("");
  const [feishuOpen, setFeishuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isCreateDraft = variant === "create_draft";
  const feishuEnabled = feishuAvailability?.enabled === true;
  const busy = submitting || confirming;
  const resolvedConfirmLabel =
    confirmLabel ??
    (isCreateDraft ? displayText(chrome.create) : displayText(chrome.upload));
  const effectiveSelection: DocumentSourceSelection | null =
    isCreateDraft && createDraftMode === "copy" ? { kind: "copy" } : selection;
  const canConfirm = isCreateDraft
    ? createDraftMode === "copy" || Boolean(selection)
    : Boolean(selection);

  useEffect(() => {
    if (!open) {
      setSelection(null);
      setCreateDraftMode("copy");
      setDescription("");
      setFeishuOpen(false);
      setConfirming(false);
      return;
    }
    if (autoOpenFeishu && feishuEnabled) {
      setFeishuOpen(true);
      if (isCreateDraft) {
        setCreateDraftMode("upload");
      }
    }
  }, [open, autoOpenFeishu, feishuEnabled, isCreateDraft]);

  const onLocalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setCreateDraftMode("upload");
    setSelection({ kind: "local", file });
  };

  const handleConfirm = async () => {
    if (!canConfirm || busy) {
      return;
    }
    setConfirming(true);
    try {
      if (isCreateDraft) {
        if (!onCreateDraftConfirm) {
          return;
        }
        const draftSelection: DocumentCreateDraftSelection =
          createDraftMode === "copy" ? { kind: "copy" } : (selection as DocumentSourceSelection);
        await onCreateDraftConfirm(draftSelection);
      } else if (selection) {
        await onConfirm(selection);
      }
    } finally {
      setConfirming(false);
    }
  };

  const docName = documentName || displayText(chrome.untitled_document);
  const statePhrase = stateLabel?.trim()
    ? displayTextTemplate(chrome.state_phrase_with_label, { state: stateLabel.trim() })
    : displayText(chrome.state_phrase);

  const introText = isCreateDraft
    ? displayTextTemplate(chrome.intro_create_draft, { name: docName })
    : displayTextTemplate(chrome.intro_upload, { name: docName, state_phrase: statePhrase });

  const loadingTitle =
    isCreateDraft && createDraftMode === "copy"
      ? displayText(chrome.creating_draft)
      : selection?.kind === "feishu"
        ? displayText(chrome.importing_from_feishu)
        : displayText(chrome.uploading);

  const loadingHint =
    isCreateDraft && createDraftMode === "copy"
      ? displayText(chrome.creating_draft_hint)
      : selection?.kind === "feishu"
        ? displayText(chrome.feishu_export_hint)
        : displayText(chrome.creating_new_version_hint);

  return (
    <>
      <Modal
        className="document-source-upload-modal"
        open={open}
        title={title}
        width={560}
        destroyOnHidden
        maskClosable={!busy}
        closable={!busy}
        onCancel={onCancel}
        styles={{ body: { position: "relative" } }}
        footer={[
          <Button key="cancel" type="link" onClick={onCancel} disabled={busy}>
            {displayText(shell.cancel ?? defaultShellChrome.cancel)}
          </Button>,
          <Button
            key="upload"
            type="primary"
            disabled={!canConfirm || busy}
            loading={busy}
            onClick={() => void handleConfirm()}
          >
            {resolvedConfirmLabel}
          </Button>,
        ]}
      >
        {busy ? (
          <div className="document-source-upload-modal__loading" aria-live="polite">
            <Spin size="large" />
            <p className="document-source-upload-modal__loading-title">{loadingTitle}</p>
            <p className="document-source-upload-modal__loading-hint">{loadingHint}</p>
          </div>
        ) : null}
        <p className="document-source-upload-modal__intro">{introText}</p>
        <p className="document-source-upload-modal__prompt">{displayText(chrome.select_file_prompt)}</p>

        <div className="document-source-upload-modal__actions">
          {isCreateDraft ? (
            <Tooltip title={displayText(chrome.copy_from_current_version)}>
              <Button
                className={[
                  "document-source-upload-modal__action-btn",
                  createDraftMode === "copy"
                    ? "document-source-upload-modal__action-btn--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                icon={<CopyOutlined />}
                disabled={busy}
                onClick={() => {
                  setCreateDraftMode("copy");
                  setSelection(null);
                }}
                aria-label={displayText(chrome.copy_from_current_version)}
                aria-pressed={createDraftMode === "copy"}
              />
            </Tooltip>
          ) : null}
          <Tooltip title={displayText(chrome.upload_from_computer)}>
            <Button
              className={[
                "document-source-upload-modal__action-btn",
                isCreateDraft && createDraftMode === "upload" && selection?.kind === "local"
                  ? "document-source-upload-modal__action-btn--selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              icon={<UploadOutlined />}
              disabled={busy}
              onClick={() => {
                if (isCreateDraft) {
                  setCreateDraftMode("upload");
                }
                fileInputRef.current?.click();
              }}
              aria-label={displayText(chrome.upload_from_computer)}
              aria-pressed={
                isCreateDraft ? createDraftMode === "upload" && selection?.kind === "local" : undefined
              }
            />
          </Tooltip>
          {feishuEnabled ? (
            <Tooltip title={displayText(chrome.import_from_feishu)}>
              <Button
                className={[
                  "document-source-upload-modal__action-btn",
                  isCreateDraft && createDraftMode === "upload" && selection?.kind === "feishu"
                    ? "document-source-upload-modal__action-btn--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                icon={<CloudUploadOutlined />}
                disabled={busy}
                onClick={() => {
                  if (isCreateDraft) {
                    setCreateDraftMode("upload");
                  }
                  onFeishuPickerOpen?.();
                  setFeishuOpen(true);
                }}
                aria-label={displayText(chrome.import_from_feishu)}
                aria-pressed={
                  isCreateDraft ? createDraftMode === "upload" && selection?.kind === "feishu" : undefined
                }
              />
            </Tooltip>
          ) : null}
        </div>

        <div className="document-source-upload-modal__file-field">
          <div className="document-source-upload-modal__field-label">{displayText(chrome.file_label)}</div>
          <div
            className={[
              "document-source-upload-modal__file-value",
              effectiveSelection ? "document-source-upload-modal__file-value--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isCreateDraft && createDraftMode === "copy" ? <CopyOutlined /> : <FileOutlined />}
            <span>
              {selectionLabel(effectiveSelection, chrome, {
                variant,
                currentVersionLabel,
              })}
            </span>
            {effectiveSelection?.kind === "feishu" ? (
              <span className="document-source-upload-modal__source-tag">Feishu</span>
            ) : null}
          </div>
        </div>

        <div className="document-source-upload-modal__description-field">
          <div className="document-source-upload-modal__field-label">
            {displayText(chrome.version_description_label)}
          </div>
          <Input.TextArea
            value={description}
            disabled={busy}
            maxLength={VERSION_DESCRIPTION_MAX}
            rows={5}
            onChange={(e) => setDescription(e.target.value)}
            showCount={{
              formatter: ({ count, maxLength }) => `${count}/${maxLength ?? VERSION_DESCRIPTION_MAX}`,
            }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="document-source-upload-modal__hidden-input"
          disabled={busy}
          onChange={onLocalFileChange}
        />
      </Modal>

      <FeishuImportModal
        open={feishuOpen}
        vaultId={vaultId}
        availability={feishuAvailability}
        onClose={() => setFeishuOpen(false)}
        onPicked={async (file) => {
          setCreateDraftMode("upload");
          setSelection({
            kind: "feishu",
            file_token: file.file_token,
            file_type: file.file_type,
            title: file.title,
            url: file.url,
          });
        }}
      />
    </>
  );
}
