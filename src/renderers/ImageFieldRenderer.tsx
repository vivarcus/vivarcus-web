import { useCallback } from "react";
import { message } from "antd";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { ImageField } from "../components/ImageField";
import { isProfileImageField, ProfileImageField } from "../components/ProfileImageField";
import type { AvatarDialogChoice } from "../components/UserProfileAvatarModal";
import { displayText } from "../lib/i18n";
import { defaultShellChrome } from "../lib/i18n/chromeTypes";
import { useUi } from "../context/UiContext";
import type { DisplayRendererProps, FormRendererProps } from "./types";

function mediaRecordId(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value).trim();
}

function profileImageTargetObject(element: FormRendererProps["element"]): string | undefined {
  return element.target_object_api_name ?? element.field_render?.target_object_api_name;
}

export function ImagePickerRenderer({
  vaultId,
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { shell } = useUi();
  const chrome = { ...defaultShellChrome, ...shell };
  const recordId = mediaRecordId(value);
  const imageUrl = element.field_render?.image?.url || (recordId ? `/ui/media/${recordId}/content` : "");
  const readOnly =
    element.read_only ||
    element.field_render?.editability === "readonly" ||
    element.field_render?.editability === "hidden";
  const targetObject = profileImageTargetObject(element);
  const useProfileDialog = isProfileImageField(element.field_api_name, targetObject);

  const handleUploaded = useCallback(
    (mediaId: string) => {
      onChange(mediaId);
    },
    [onChange],
  );

  const handleProfileConfirm = useCallback(
    async (choice: AvatarDialogChoice) => {
      if (choice.mode === "default") {
        onChange("");
        return;
      }
      try {
        const uploaded = await api.uploadMedia(vaultId, choice.file);
        onChange(uploaded.record_id);
      } catch (err) {
        message.error(err instanceof Error ? err.message : displayText(chrome.image_upload_failed));
        throw err;
      }
    },
    [chrome, onChange, vaultId],
  );

  const field = useProfileDialog ? (
    <ProfileImageField
      vaultId={vaultId}
      imageUrl={imageUrl}
      mediaRecordId={recordId}
      alt={element.label?.text ?? element.field_api_name ?? displayText(chrome.image_alt)}
      editable={!readOnly}
      onConfirm={handleProfileConfirm}
    />
  ) : (
    <ImageField
      vaultId={vaultId}
      imageUrl={imageUrl}
      alt={element.label?.text ?? element.field_api_name ?? displayText(chrome.image_alt)}
      editable={!readOnly}
      onUploaded={readOnly ? undefined : handleUploaded}
    />
  );

  if (!showLabel) {
    return field;
  }

  return field;
}

export function DisplayImageRenderer({
  vaultId,
  value,
  fieldApiName,
  fieldRender,
  onRecordMutated,
}: DisplayRendererProps) {
  const { shell } = useUi();
  const chrome = { ...defaultShellChrome, ...shell };
  const { objectName, recordId } = useParams();
  const mediaId = mediaRecordId(value);
  const imageUrl = fieldRender?.image?.url || (mediaId ? `/ui/media/${mediaId}/content` : "");
  const targetObject = fieldRender?.target_object_api_name;
  const editable =
    Boolean(vaultId) &&
    fieldRender?.editability === "editable" &&
    isProfileImageField(fieldApiName, targetObject) &&
    Boolean(objectName && recordId);

  const handleProfileConfirm = useCallback(
    async (choice: AvatarDialogChoice) => {
      if (!vaultId || !objectName || !recordId) {
        return;
      }
      try {
        if (choice.mode === "default") {
          await api.updateRecordFields(vaultId, objectName, recordId, { image__sys: "" });
        } else {
          const uploaded = await api.uploadMedia(vaultId, choice.file);
          await api.updateRecordFields(vaultId, objectName, recordId, {
            image__sys: uploaded.record_id,
          });
        }
        await onRecordMutated?.();
      } catch (err) {
        message.error(err instanceof Error ? err.message : displayText(chrome.image_save_failed));
        throw err;
      }
    },
    [chrome, objectName, onRecordMutated, recordId, vaultId],
  );

  if (!vaultId) {
    return null;
  }

  if (editable) {
    return (
      <ProfileImageField
        vaultId={vaultId}
        imageUrl={imageUrl}
        mediaRecordId={mediaId}
        alt={fieldRender?.image?.alt ?? displayText(chrome.image_alt)}
        editable
        onConfirm={handleProfileConfirm}
      />
    );
  }

  return (
    <ImageField
      vaultId={vaultId}
      imageUrl={imageUrl}
      alt={fieldRender?.image?.alt ?? displayText(chrome.image_alt)}
      editable={false}
    />
  );
}
