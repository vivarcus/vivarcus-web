import { Alert, Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
import type { UserProfileModel } from "../api/types";
import { displayText } from "../lib/i18n/displayText";
import "../styles/components/user-profile-password-modal.css";

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type Props = {
  open: boolean;
  chrome?: UserProfileModel["chrome"];
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (payload: ChangePasswordPayload) => Promise<void>;
};

export function UserProfilePasswordModal({
  open,
  chrome,
  saving = false,
  onCancel,
  onConfirm,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }, [open]);

  const handleOk = async () => {
    setError(null);
    if (!currentPassword.trim() || !newPassword.trim()) {
      setError("Current password and new password are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must differ from current password");
      return;
    }
    try {
      await onConfirm({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    }
  };

  return (
    <Modal
      className="user-profile-password-modal"
      open={open}
      title={displayText(chrome?.change_password, "Change Password")}
      width={440}
      zIndex={1100}
      getContainer={() => document.body}
      destroyOnHidden
      onCancel={onCancel}
      footer={[
        <Button key="cancel" type="link" onClick={onCancel} disabled={saving}>
          {displayText(chrome?.cancel_label, "Cancel")}
        </Button>,
        <Button key="ok" type="primary" loading={saving} onClick={() => void handleOk()}>
          {displayText(chrome?.confirm_label, "Confirm")}
        </Button>,
      ]}
    >
      <Form layout="vertical" className="user-profile-password-modal__form">
        <Form.Item
          label={displayText(chrome?.current_password_label, "Current Password")}
          required
        >
          <Input.Password
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
          />
        </Form.Item>
        <Form.Item
          label={displayText(chrome?.new_password_label, "New Password")}
          required
        >
          <Input.Password
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
          />
        </Form.Item>
        <Form.Item
          label={displayText(chrome?.confirm_password_label, "Confirm New Password")}
          required
        >
          <Input.Password
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
          />
        </Form.Item>
      </Form>
      {error ? <Alert type="error" title={error} showIcon role="alert" /> : null}
    </Modal>
  );
}
