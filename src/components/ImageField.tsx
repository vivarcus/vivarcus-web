import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { EditOutlined } from "@ant-design/icons";
import { message } from "antd";
import "../styles/components/image-field.css";
import { api } from "../api/client";
import { displayText } from "../lib/i18n";
import { defaultShellChrome } from "../lib/i18n/chromeTypes";
import { useUi } from "../context/UiContext";

type Props = {
  vaultId: string;
  imageUrl?: string;
  alt?: string;
  editable?: boolean;
  editLabel?: string;
  onUploaded?: (mediaRecordId: string, contentUrl: string) => void;
  uploadFile?: (file: File) => Promise<{ record_id: string; content_url: string }>;
  onEditClick?: () => void;
  className?: string;
  size?: "default" | "profile";
  dialogTrigger?: boolean;
};

const ACCEPT = "image/png,image/jpeg,image/gif";

export function ImageField({
  vaultId,
  imageUrl,
  alt,
  editable = false,
  editLabel = "Edit",
  onUploaded,
  uploadFile,
  onEditClick,
  className,
  size = "default",
  dialogTrigger = false,
}: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultShellChrome, ...shell };
  const resolvedAlt = alt ?? displayText(chrome.image_alt);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const remotePath = imageUrl?.trim() || "";
  const displayPath = previewUrl ?? remotePath;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!displayPath || displayPath.startsWith("blob:")) {
        setLoadedUrl(displayPath || null);
        return;
      }
      try {
        const blob = await api.fetchMediaBlob(vaultId, displayPath);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLoadedUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setLoadedUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [vaultId, displayPath]);

  const openPicker = useCallback(() => {
    if (!editable || uploading) {
      return;
    }
    if (onEditClick) {
      onEditClick();
      return;
    }
    inputRef.current?.click();
  }, [editable, onEditClick, uploading]);

  const onFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !onUploaded) {
        return;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        message.error(displayText(chrome.unsupported_image_type));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        message.error(displayText(chrome.image_too_large));
        return;
      }
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);
      try {
        const result = uploadFile
          ? await uploadFile(file)
          : await api.uploadMedia(vaultId, file);
        onUploaded(result.record_id, result.content_url);
        setPreviewUrl(result.content_url);
      } catch (err) {
        setPreviewUrl(null);
        message.error(err instanceof Error ? err.message : displayText(chrome.image_upload_failed));
      } finally {
        setUploading(false);
        URL.revokeObjectURL(localPreview);
      }
    },
    [chrome, onUploaded, uploadFile, vaultId],
  );

  const rootClass = [
    "image-field",
    dialogTrigger ? "image-field--dialog-trigger" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleFieldClick = useCallback(() => {
    if (!dialogTrigger || !onEditClick) {
      return;
    }
    openPicker();
  }, [dialogTrigger, onEditClick, openPicker]);

  return (
    <div
      className={[
        size === "profile" ? "user-profile-page__avatar-wrap" : null,
        dialogTrigger ? "image-field-host--dialog" : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      onClick={dialogTrigger ? () => handleFieldClick() : undefined}
      onKeyDown={
        dialogTrigger
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleFieldClick();
              }
            }
          : undefined
      }
      role={dialogTrigger ? "button" : undefined}
      tabIndex={dialogTrigger && editable ? 0 : undefined}
    >
      <div className={rootClass}>
        {loadedUrl ? (
          <img className="image-field__preview" src={loadedUrl} alt={resolvedAlt} />
        ) : (
          <div className="image-field__placeholder" aria-hidden="true" />
        )}
        {editable && (
          <button
            type="button"
            className="image-field__edit"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            disabled={uploading}
            aria-label={editLabel}
          >
            <EditOutlined className="image-field__edit-icon" aria-hidden="true" />
            <span>{editLabel}</span>
          </button>
        )}
        <input
          ref={inputRef}
          className="image-field__input"
          type="file"
          accept={ACCEPT}
          onChange={(event) => void onFileChange(event)}
        />
      </div>
    </div>
  );
}
