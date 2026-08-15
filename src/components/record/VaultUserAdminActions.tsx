import { Alert, Button, Checkbox, Input, Modal, Select, Space, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, HttpError } from "../../api/client";
import { displayText } from "../../lib/i18n";
import { RecordSectionBlock } from "./RecordSectionBlock";
import {
  fetchAssignableSecurityPolicies,
  fetchVaultUserAdminProfile,
  toProfileInput,
  vaultUserAdminChrome as chrome,
  type SecurityPolicyOption,
  type VaultUserAdminProfile,
} from "../../lib/vaultUserAdmin";

type Props = {
  vaultId: string;
  /** user__sys record id (RecordDetailPage recordId). */
  recordId: string;
  /** Reloads the underlying record page after a successful mutation. */
  onReloaded: () => void | Promise<void>;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    return err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

/**
 * Domain identity edit actions on the user__sys (Vault User) record detail page.
 * Domain Status (domain_active__v) is changed from Admin > Domain Users, matching
 * Veeva's "Change Domain Status to Active/Inactive" action.
 */
export function VaultUserAdminActions({ vaultId, recordId, onReloaded }: Props) {
  const [profile, setProfile] = useState<VaultUserAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await fetchVaultUserAdminProfile(vaultId, recordId);
      setProfile(loaded);
    } catch (err) {
      setProfile(null);
      setLoadError(errorMessage(err, displayText(chrome.unavailable)));
    } finally {
      setLoading(false);
    }
  }, [vaultId, recordId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const domainUserId = profile?.domainUserId ?? "";
  const canAct = Boolean(domainUserId);

  const afterMutation = useCallback(async () => {
    await loadProfile();
    await onReloaded();
  }, [loadProfile, onReloaded]);

  return (
    <RecordSectionBlock title={displayText(chrome.section_title)}>
      {loading ? (
        <Spin size="small" description={displayText(chrome.loading)} />
      ) : loadError ? (
        <Alert type="error" showIcon title={loadError} role="alert" />
      ) : (
        <>
          {!canAct && (
            <Alert
              type="info"
              showIcon
              title={displayText(chrome.unavailable)}
              style={{ marginBottom: 12 }}
            />
          )}
          <Space wrap>
            <Button disabled={!canAct} onClick={() => setEditOpen(true)}>
              {displayText(chrome.edit_profile)}
            </Button>
            <Button disabled={!canAct} onClick={() => setPolicyOpen(true)}>
              {displayText(chrome.security_policy)}
            </Button>
          </Space>
        </>
      )}

      {profile && canAct && (
        <EditDomainProfileModal
          open={editOpen}
          vaultId={vaultId}
          userId={domainUserId}
          initial={profile}
          onCancel={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await afterMutation();
          }}
        />
      )}
      {canAct && (
        <SecurityPolicyModal
          open={policyOpen}
          vaultId={vaultId}
          userId={domainUserId}
          onCancel={() => setPolicyOpen(false)}
          onSaved={async () => {
            setPolicyOpen(false);
            await afterMutation();
          }}
        />
      )}
    </RecordSectionBlock>
  );
}

type EditModalProps = {
  open: boolean;
  vaultId: string;
  userId: string;
  initial: VaultUserAdminProfile;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

function FieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
        {label}
        {required && <span className="field__required">*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>{hint}</div>
      )}
    </div>
  );
}

export function EditDomainProfileModal({
  open,
  vaultId,
  userId,
  initial,
  onCancel,
  onSaved,
}: EditModalProps) {
  const [draft, setDraft] = useState<VaultUserAdminProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setError(null);
    }
  }, [open, initial]);

  const canSave = useMemo(
    () =>
      Boolean(
        draft.firstName.trim() &&
          draft.lastName.trim() &&
          draft.email.trim() &&
          draft.language.trim() &&
          draft.locale.trim() &&
          draft.timezone.trim(),
      ),
    [draft],
  );

  function update<K extends keyof VaultUserAdminProfile>(
    key: K,
    value: VaultUserAdminProfile[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateVaultUserProfile(vaultId, userId, toProfileInput(draft));
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, displayText(chrome.unavailable)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={displayText(chrome.edit_profile_title)}
      width={720}
      destroyOnHidden
      onCancel={onCancel}
      confirmLoading={saving}
      okText={displayText(chrome.save)}
      cancelText={displayText(chrome.cancel)}
      okButtonProps={{ disabled: !canSave }}
      onOk={() => void handleSave()}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          role="alert"
          style={{ marginBottom: 12 }}
        />
      )}
      <FieldRow
        label={displayText(chrome.username_label)}
        hint={displayText(chrome.username_readonly_hint)}
      >
        <Input value={draft.username} disabled />
      </FieldRow>
      <FieldRow label={displayText(chrome.first_name_label)} required>
        <Input value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} />
      </FieldRow>
      <FieldRow label={displayText(chrome.last_name_label)} required>
        <Input value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} />
      </FieldRow>
      <FieldRow label={displayText(chrome.company_name_label)}>
        <Input value={draft.companyName} onChange={(e) => update("companyName", e.target.value)} />
      </FieldRow>
      <FieldRow label={displayText(chrome.email_label)} required>
        <Input value={draft.email} onChange={(e) => update("email", e.target.value)} />
      </FieldRow>
      <FieldRow
        label={displayText(chrome.language_label)}
        required
        hint={displayText(chrome.code_hint)}
      >
        <Input value={draft.language} onChange={(e) => update("language", e.target.value)} />
      </FieldRow>
      <FieldRow
        label={displayText(chrome.locale_label)}
        required
        hint={displayText(chrome.code_hint)}
      >
        <Input value={draft.locale} onChange={(e) => update("locale", e.target.value)} />
      </FieldRow>
      <FieldRow
        label={displayText(chrome.timezone_label)}
        required
        hint={displayText(chrome.code_hint)}
      >
        <Input value={draft.timezone} onChange={(e) => update("timezone", e.target.value)} />
      </FieldRow>
      <div style={{ marginBottom: 8 }}>
        <Checkbox
          checked={draft.productAnnouncementEmails}
          onChange={(e) => update("productAnnouncementEmails", e.target.checked)}
        >
          {displayText(chrome.product_announcement_label)}
        </Checkbox>
      </div>
      <div>
        <Checkbox
          checked={draft.serviceAvailabilityNotifications}
          onChange={(e) => update("serviceAvailabilityNotifications", e.target.checked)}
        >
          {displayText(chrome.service_availability_label)}
        </Checkbox>
      </div>
    </Modal>
  );
}

type PolicyModalProps = {
  open: boolean;
  vaultId: string;
  userId: string;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

export function SecurityPolicyModal({
  open,
  vaultId,
  userId,
  onCancel,
  onSaved,
}: PolicyModalProps) {
  const [options, setOptions] = useState<SecurityPolicyOption[] | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [policyKey, setPolicyKey] = useState("");
  const [federatedId, setFederatedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPolicyKey("");
    setFederatedId("");
    setError(null);
    setManualEntry(false);
    setOptions(null);
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await fetchAssignableSecurityPolicies(vaultId);
        if (!cancelled) {
          setOptions(loaded);
        }
      } catch {
        // Degrade to manual policy-key entry when the list cannot be loaded.
        if (!cancelled) {
          setOptions([]);
          setManualEntry(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, vaultId]);

  const canSave = Boolean(policyKey.trim());

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateVaultUserSecurityPolicy(vaultId, userId, {
        policy_key: policyKey.trim(),
        federated_id: federatedId.trim() || undefined,
      });
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, displayText(chrome.unavailable)));
    } finally {
      setSaving(false);
    }
  }

  const loadingOptions = options === null;

  return (
    <Modal
      open={open}
      title={displayText(chrome.security_policy_title)}
      width={520}
      destroyOnHidden
      onCancel={onCancel}
      confirmLoading={saving}
      okText={displayText(chrome.save)}
      cancelText={displayText(chrome.cancel)}
      okButtonProps={{ disabled: !canSave }}
      onOk={() => void handleSave()}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          role="alert"
          style={{ marginBottom: 12 }}
        />
      )}
      {manualEntry ? (
        <FieldRow
          label={displayText(chrome.policy_manual_label)}
          required
          hint={displayText(chrome.policy_manual_hint)}
        >
          <Input
            value={policyKey}
            onChange={(e) => setPolicyKey(e.target.value)}
            placeholder={displayText(chrome.policy_placeholder)}
          />
        </FieldRow>
      ) : (
        <FieldRow label={displayText(chrome.policy_label)} required>
          <Select
            style={{ width: "100%" }}
            loading={loadingOptions}
            value={policyKey || undefined}
            placeholder={displayText(chrome.policy_placeholder)}
            options={options ?? []}
            onChange={(value) => setPolicyKey(String(value ?? ""))}
            showSearch
            optionFilterProp="label"
          />
        </FieldRow>
      )}
      <FieldRow
        label={displayText(chrome.federated_id_label)}
        hint={displayText(chrome.federated_id_hint)}
      >
        <Input value={federatedId} onChange={(e) => setFederatedId(e.target.value)} />
      </FieldRow>
    </Modal>
  );
}
