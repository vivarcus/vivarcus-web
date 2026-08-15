import { Alert, Button, Checkbox, Input, InputNumber, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { VaultAISettingsModel } from "../api/types";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

export function VaultAISettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<VaultAISettingsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [advancedConnection, setAdvancedConnection] = useState("platform_default");
  const [basicConnection, setBasicConnection] = useState("platform_default");
  const [maxOutputTokens, setMaxOutputTokens] = useState(4096);
  const [autoSwitch, setAutoSwitch] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.vaultAISettings(vaultId);
      setModel(data);
      setEnabled(data.enabled);
      setAdvancedConnection(data.advanced_llm_connection || "platform_default");
      setBasicConnection(data.basic_llm_connection || "platform_default");
      setMaxOutputTokens(data.max_output_tokens || 4096);
      setAutoSwitch(data.auto_switch_conversation !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!vaultId || !model?.can_edit) return;
    setSaving(true);
    try {
      const next = await api.patchVaultAISettings(vaultId, {
        enabled,
        advanced_llm_connection: advancedConnection,
        basic_llm_connection: basicConnection,
        max_output_tokens: maxOutputTokens,
        auto_switch_conversation: autoSwitch,
      });
      setModel(next);
      setEnabled(next.enabled);
      setAdvancedConnection(next.advanced_llm_connection);
      setBasicConnection(next.basic_llm_connection);
      setMaxOutputTokens(next.max_output_tokens);
      setAutoSwitch(next.auto_switch_conversation);
      message.success(displayText(next.chrome.save_label));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSaving(false);
    }
  };

  if (!vaultId) return null;
  if (loading && !model) {
    return <AdminPageLoading />;
  }
  if (error && !model) {
    return (
      <AdminPageShell title="Vault AI Settings">
        <Alert type="error" title={error} showIcon />
      </AdminPageShell>
    );
  }
  if (!model) return null;
  const chrome = model.chrome;
  const disabled = !model.can_edit || saving;

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      <div className="admin-page__body admin-settings-form__body">
        <RecordSectionBlock title={displayText(chrome.section_title)}>
          <div className="admin-settings-form__options">
            <label className="admin-settings-form__toggle">
              <Checkbox checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.enabled_label)}
              </span>
            </label>
          </div>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.advanced_llm_connection_label)}
            </span>
            <div className="admin-settings-form__control">
              <Input
                value={advancedConnection}
                disabled={disabled}
                onChange={(e) => setAdvancedConnection(e.target.value)}
              />
              <p className="admin-settings-form__hint admin-settings-form__hint--flush">
                {displayText(chrome.advanced_llm_help)}
              </p>
            </div>
          </div>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.basic_llm_connection_label)}
            </span>
            <div className="admin-settings-form__control">
              <Input
                value={basicConnection}
                disabled={disabled}
                onChange={(e) => setBasicConnection(e.target.value)}
              />
              <p className="admin-settings-form__hint admin-settings-form__hint--flush">
                {displayText(chrome.basic_llm_help)}
              </p>
            </div>
          </div>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.max_output_tokens_label)}
            </span>
            <div className="admin-settings-form__control">
              <InputNumber
                min={512}
                max={10000}
                value={maxOutputTokens}
                disabled={disabled}
                onChange={(v) => setMaxOutputTokens(typeof v === "number" ? v : 4096)}
              />
              <p className="admin-settings-form__hint admin-settings-form__hint--flush">
                {displayText(chrome.max_output_tokens_help)}
              </p>
            </div>
          </div>
          <div className="admin-settings-form__options">
            <label className="admin-settings-form__toggle">
              <Checkbox checked={autoSwitch} disabled={disabled} onChange={(e) => setAutoSwitch(e.target.checked)} />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.auto_switch_conversation_label)}
              </span>
            </label>
            <p className="admin-settings-form__hint">
              {displayText(chrome.auto_switch_conversation_help)}
            </p>
          </div>
          <footer className="admin-settings-form__footer-actions">
            <Button type="primary" disabled={!model.can_edit} loading={saving} onClick={() => void save()}>
              {displayText(chrome.save_label)}
            </Button>
          </footer>
        </RecordSectionBlock>
      </div>
    </AdminPageShell>
  );
}
