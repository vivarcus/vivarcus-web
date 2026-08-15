import { Button, Modal, message } from "antd";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { UserProfileModel } from "../api/types";
import { displayText } from "../lib/i18n/displayText";
import "../styles/components/user-profile-avatar-modal.css";

const ACCEPT = "image/png,image/jpeg,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

export type AvatarDialogChoice =
  | { mode: "default" }
  | { mode: "upload"; file: File };

type AvatarMode = "default" | "upload";

type Props = {
  open: boolean;
  hasCustomAvatar: boolean;
  chrome?: UserProfileModel["chrome"];
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (choice: AvatarDialogChoice) => Promise<void>;
};

export function UserProfileAvatarModal({
  open,
  hasCustomAvatar,
  chrome,
  saving = false,
  onCancel,
  onConfirm,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AvatarMode>(hasCustomAvatar ? "upload" : "default");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setMode(hasCustomAvatar ? "upload" : "default");
    setSelectedFile(null);
    setSelectedFileName("");
  }, [hasCustomAvatar, open]);

  const onChooseClick = () => {
    inputRef.current?.click();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      message.error(displayText(chrome?.avatar_unsupported_type, "Unsupported image type"));
      return;
    }
    if (file.size > MAX_BYTES) {
      message.error(displayText(chrome?.avatar_too_large, "Image must be 2 MB or smaller"));
      return;
    }
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setMode("upload");
  };

  const handleOk = async () => {
    if (mode === "default") {
      await onConfirm({ mode: "default" });
      return;
    }
    if (!selectedFile) {
      message.error(
        displayText(chrome?.avatar_no_file_selected, "Please choose an image to upload."),
      );
      return;
    }
    await onConfirm({ mode: "upload", file: selectedFile });
  };

  return (
    <Modal
      className="user-profile-avatar-modal"
      open={open}
      title={displayText(chrome?.avatar_dialog_title, "User Profile")}
      width={520}
      zIndex={1100}
      getContainer={() => document.body}
      destroyOnHidden
      onCancel={onCancel}
      footer={[
        <Button key="cancel" type="link" onClick={onCancel} disabled={saving}>
          {displayText(chrome?.cancel_label, "Cancel")}
        </Button>,
        <Button key="ok" type="primary" loading={saving} onClick={() => void handleOk()}>
          {displayText(chrome?.ok_label, "OK")}
        </Button>,
      ]}
    >
      <p className="user-profile-avatar-modal__intro">
        {displayText(
          chrome?.avatar_dialog_intro,
          "Profile pictures display throughout the application and are visible to other users.",
        )}
      </p>

      <fieldset className="user-profile-avatar-modal__options">
        <legend className="user-profile-avatar-modal__legend">Profile picture</legend>

        <label className="user-profile-avatar-modal__option">
          <input
            type="radio"
            name="avatar-mode"
            value="default"
            checked={mode === "default"}
            onChange={() => setMode("default")}
          />
          <span>{displayText(chrome?.avatar_use_default_label, "Use default image")}</span>
        </label>

        <div className="user-profile-avatar-modal__upload-block">
          <label className="user-profile-avatar-modal__option">
            <input
              type="radio"
              name="avatar-mode"
              value="upload"
              checked={mode === "upload"}
              onChange={() => setMode("upload")}
            />
            <span>{displayText(chrome?.avatar_upload_label, "Upload an image:")}</span>
          </label>

          <div className="user-profile-avatar-modal__choose-row">
            <Button
              className="user-profile-avatar-modal__choose-btn"
              disabled={mode !== "upload" || saving}
              onClick={onChooseClick}
            >
              {displayText(chrome?.avatar_choose_label, "Choose")}
            </Button>
            {selectedFileName ? (
              <span className="user-profile-avatar-modal__filename">{selectedFileName}</span>
            ) : null}
          </div>

          <p className="user-profile-avatar-modal__help">
            {displayText(
              chrome?.avatar_upload_help_formats,
              "Uploaded images must be JPG, PNG, or GIF files less than 2 MB in size.",
            )}
          </p>
          <p className="user-profile-avatar-modal__help">
            {displayText(
              chrome?.avatar_upload_help_resize,
              "Images larger than 100 x 100 pixels will resize automatically after upload.",
            )}
          </p>
        </div>
      </fieldset>

      <input
        ref={inputRef}
        className="user-profile-avatar-modal__input"
        type="file"
        accept={ACCEPT}
        onChange={onFileChange}
      />
    </Modal>
  );
}
