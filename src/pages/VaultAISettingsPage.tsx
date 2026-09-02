import { Alert, Button, Checkbox, Input, InputNumber, Select, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { VaultAISettingsModel } from "../api/types";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { formatTokenUsageGmt } from "../lib/vaultAITokenUsage";

const DEFAULT_ADVANCED_LLM = "ai_llm__sys";
const DEFAULT_BASIC_LLM = "ai_basic_llm__sys";

function formatMillions(n: number | undefined): string {
  return (n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function VaultAISettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<VaultAISettingsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [advancedConnection, setAdvancedConnection] = useState(DEFAULT_ADVANCED_LLM);
  const [basicConnection, setBasicConnection] = useState(DEFAULT_BASIC_LLM);
  const [maxOutputTokens, setMaxOutputTokens] = useState(4096);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [alertLimit, setAlertLimit] = useState<number | null>(null);
  const [alertEmail, setAlertEmail] = useState("");

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.vaultAISettings(vaultId);
      setModel(data);
      setEnabled(data.enabled);
      setAdvancedConnection(data.advanced_llm_connection || DEFAULT_ADVANCED_LLM);
      setBasicConnection(data.basic_llm_connection || DEFAULT_BASIC_LLM);
      setMaxOutputTokens(data.max_output_tokens || 4096);
      setAutoSwitch(data.auto_switch_conversation !== false);
      setAlertLimit(data.token_alert_limit_millions ?? null);
      setAlertEmail(data.token_alert_email ?? "");
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
        token_alert_limit_millions: alertLimit ?? undefined,
        clear_token_alert_limit: alertLimit == null,
        token_alert_email: alertEmail,
      });
      setModel(next);
      setEnabled(next.enabled);
      setAdvancedConnection(next.advanced_llm_connection);
      setBasicConnection(next.basic_llm_connection);
      setMaxOutputTokens(next.max_output_tokens);
      setAutoSwitch(next.auto_switch_conversation);
      setAlertLimit(next.token_alert_limit_millions ?? null);
      setAlertEmail(next.token_alert_email ?? "");
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
      <AdminPageShell title={displayText(shell.admin_vault_ai_settings)}>
        <Alert type="error" title={error} showIcon />
      </AdminPageShell>
    );
  }
  if (!model) return null;
  const chrome = model.chrome;
  const disabled = !model.can_edit || saving;
  const llmOptions = (() => {
    const seen = new Set<string>();
    const items: Array<{ value: string; label: string }> = [];
    for (const opt of model.llm_connections ?? []) {
      const value = opt.api_name?.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      items.push({ value, label: opt.name?.trim() ? `${opt.name} (${value})` : value });
    }
    for (const current of [advancedConnection, basicConnection]) {
      const value = current.trim();
      if (value && !seen.has(value)) {
        seen.add(value);
        items.push({ value, label: value });
      }
    }
    return items;
  })();

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
              <Select
                value={advancedConnection}
                disabled={disabled}
                options={llmOptions}
                showSearch
                optionFilterProp="label"
                onChange={(v) => setAdvancedConnection(typeof v === "string" ? v : DEFAULT_ADVANCED_LLM)}
                style={{ width: "100%" }}
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
              <Select
                value={basicConnection}
                disabled={disabled}
                options={llmOptions}
                showSearch
                optionFilterProp="label"
                onChange={(v) => setBasicConnection(typeof v === "string" ? v : DEFAULT_BASIC_LLM)}
                style={{ width: "100%" }}
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
        </RecordSectionBlock>
        <RecordSectionBlock title={displayText(chrome.llm_token_usage_title)}>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.alert_limit_label)}
            </span>
            <div className="admin-settings-form__control admin-token-usage__limit">
              <InputNumber
                min={0}
                precision={0}
                step={1}
                value={alertLimit ?? undefined}
                disabled={disabled}
                onChange={(v) => setAlertLimit(typeof v === "number" ? v : null)}
              />
              <span className="admin-token-usage__suffix">{displayText(chrome.alert_limit_suffix)}</span>
            </div>
          </div>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.alert_email_label)}
            </span>
            <div className="admin-settings-form__control">
              <Input
                type="email"
                value={alertEmail}
                disabled={disabled}
                onChange={(e) => setAlertEmail(e.target.value)}
              />
            </div>
          </div>
          <p className="admin-token-usage__as-of">
            {displayTextTemplate(chrome.usage_as_of_label, {
              datetime: formatTokenUsageGmt(model.token_usage?.as_of),
            })}
          </p>
          <dl className="admin-token-usage__dl">
            <div>
              <dt>{displayText(chrome.vault_ai_llm_label)}</dt>
              <dd>{formatMillions(model.token_usage?.vault_ai_llm)}</dd>
            </div>
            <div>
              <dt>{displayText(chrome.customer_llm_label)}</dt>
              <dd>{formatMillions(model.token_usage?.customer_llm)}</dd>
            </div>
            <div>
              <dt>{displayText(chrome.total_30_day_label)}</dt>
              <dd>{formatMillions(model.token_usage?.total_30_day)}</dd>
            </div>
          </dl>
          <p className="admin-token-usage__as-of">
            {displayTextTemplate(chrome.hourly_usage_label, {
              from: formatTokenUsageGmt(model.token_usage?.hourly_from),
              to: formatTokenUsageGmt(model.token_usage?.hourly_to),
            })}
          </p>
          <dl className="admin-token-usage__dl">
            <div>
              <dt>{displayText(chrome.hourly_total_label)}</dt>
              <dd>{formatMillions(model.token_usage?.hourly_total)}</dd>
            </div>
          </dl>
        </RecordSectionBlock>
        <footer className="admin-settings-form__footer-actions">
          <Button type="primary" disabled={!model.can_edit} loading={saving} onClick={() => void save()}>
            {displayText(chrome.save_label)}
          </Button>
        </footer>
      </div>
    </AdminPageShell>
  );
}
