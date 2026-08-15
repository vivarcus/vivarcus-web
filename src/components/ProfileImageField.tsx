import { useState } from "react";
import { ImageField } from "./ImageField";
import {
  UserProfileAvatarModal,
  type AvatarDialogChoice,
} from "./UserProfileAvatarModal";
import type { UserProfileModel } from "../api/types";

export function isProfileImageField(
  fieldApiName?: string,
  targetObjectApiName?: string,
): boolean {
  return fieldApiName === "image__sys" && targetObjectApiName === "media__sys";
}

type Props = {
  vaultId: string;
  imageUrl?: string;
  mediaRecordId?: string;
  alt?: string;
  editable?: boolean;
  editLabel?: string;
  size?: "default" | "profile";
  chrome?: UserProfileModel["chrome"];
  onConfirm: (choice: AvatarDialogChoice) => Promise<void>;
};

export function ProfileImageField({
  vaultId,
  imageUrl,
  mediaRecordId,
  alt = "Profile image",
  editable = false,
  editLabel = "Edit",
  size = "default",
  chrome,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editable) {
    return (
      <ImageField
        vaultId={vaultId}
        imageUrl={imageUrl}
        alt={alt}
        size={size}
        editable={false}
      />
    );
  }

  const handleConfirm = async (choice: AvatarDialogChoice) => {
    setSaving(true);
    try {
      await onConfirm(choice);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ImageField
        vaultId={vaultId}
        imageUrl={imageUrl}
        alt={alt}
        editable={!saving}
        editLabel={editLabel}
        size={size}
        dialogTrigger
        onEditClick={() => setOpen(true)}
      />
      <UserProfileAvatarModal
        open={open}
        hasCustomAvatar={Boolean(mediaRecordId)}
        chrome={chrome}
        saving={saving}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
