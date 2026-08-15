import { Alert, Button, Form, Input, Select, Spin } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type {
  LayoutProfileAssignmentModel,
  LayoutProfileListModel,
} from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

function formatAssignedAt(value: string | undefined, empty: string): string {
  if (!value) return empty;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function LayoutProfilePage() {
  const vaultId = useVaultId();
  const { session } = useAuth();
  const { shell } = useUi();
  const [profiles, setProfiles] = useState<LayoutProfileListModel | null>(null);
  const [assignment, setAssignment] = useState<LayoutProfileAssignmentModel | null>(
    null,
  );
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const effectiveUserId = targetUserId.trim() || session?.userId || "";

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const [profileList, current] = await Promise.all([
        api.layoutProfiles(vaultId),
        api.layoutProfileAssignment(
          vaultId,
          targetUserId.trim() || undefined,
        ),
      ]);
      setProfiles(profileList);
      setAssignment(current);
      setSelectedProfile(current.profile_api_name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_layout_profile_failed));
      setProfiles(null);
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, targetUserId, shell.load_layout_profile_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) {
    return null;
  }

  async function onSubmit() {
    if (!selectedProfile.trim()) {
      setError(displayText(shell.select_layout_profile));
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.assignLayoutProfile(vaultId!, {
        profile_api_name: selectedProfile.trim(),
        user_id: targetUserId.trim() || undefined,
      });
      setAssignment(updated);
      setSelectedProfile(updated.profile_api_name ?? selectedProfile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_assignment_failed));
    } finally {
      setSaving(false);
    }
  }

  const profileOptions =
    profiles?.profiles.map((p) => ({
      value: p.api_name,
      label: `${p.label} (${p.api_name})${p.system_kind ? ` · ${p.system_kind}` : ""}`,
    })) ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header__breadcrumb">
            <Link to={`/`}>{displayText(shell.back)}</Link>
          </p>
          <h1>{displayText(shell.layout_profile_title)}</h1>
          <p className="page-header__meta">{displayText(shell.layout_profile_subtitle)}</p>
        </div>
      </header>

      {assignment?.profile_api_name && (
        <p className="page-header__meta">
          {displayText(shell.current_assignment_prefix)}{" "}
          {assignment.profile_label ?? assignment.profile_api_name}
          {assignment.system_kind ? ` (${assignment.system_kind})` : ""}
          {" · "}
          {displayText(shell.assigned_at_prefix)}{" "}
          {formatAssignedAt(assignment.assigned_at, displayText(shell.empty_value))}
        </p>
      )}

      <Form
        className="filter-bar"
        layout="inline"
        requiredMark={false}
        onFinish={() => void onSubmit()}
      >
        <Form.Item label={displayText(shell.target_user_id)}>
          <Input
            className="mono"
            value={targetUserId}
            placeholder={session?.userId ?? displayText(shell.current_user_placeholder)}
            onChange={(e) => setTargetUserId(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={displayText(shell.admin_layout_profile)}>
          <Select
            value={selectedProfile || undefined}
            placeholder={
              profiles?.profiles.length
                ? displayText(shell.please_select)
                : displayText(shell.no_profiles_available)
            }
            disabled={loading || !profiles?.profiles.length}
            options={profileOptions}
            style={{ minWidth: 220 }}
            onChange={(value) => setSelectedProfile(value ?? "")}
            allowClear
          />
        </Form.Item>
        <Form.Item>
          <Button disabled={loading} onClick={() => void load()}>
            {displayText(shell.refresh)}
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={saving || loading || !selectedProfile}
          >
            {saving ? displayText(shell.saving) : displayText(shell.save)}
          </Button>
        </Form.Item>
      </Form>
      <p className="page-header__meta">
        {displayText(shell.viewing_user)}{" "}
        {effectiveUserId ? `${effectiveUserId.slice(0, 8)}…` : displayText(shell.empty_value)}
      </p>

      {saved && (
        <Alert type="info" title={displayText(shell.layout_profile_updated)} showIcon />
      )}
      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !profiles && (
        <Spin
          description={displayText(shell.loading_layout_profiles)}
          className="page-loading page__loading"
        />
      )}
    </div>
  );
}
