import { Alert, Button, Checkbox, InputNumber, Select, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ApplicationSettingsModel } from "../api/types";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

export function ApplicationSettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<ApplicationSettingsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [startDateField, setStartDateField] = useState("created_date__v");
  const [endDateField, setEndDateField] = useState("approved_date__v");
  const [thresholdDays, setThresholdDays] = useState(30);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.applicationSettings(vaultId);
      setModel(data);
      setEnabled(data.timeliness.enabled);
      setStartDateField(data.timeliness.start_date_field);
      setEndDateField(data.timeliness.end_date_field);
      setThresholdDays(data.timeliness.threshold_days);
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
      const next = await api.patchApplicationSettings(vaultId, {
        enabled,
        start_date_field: startDateField,
        end_date_field: endDateField,
        threshold_days: thresholdDays,
      });
      setModel(next);
      setEnabled(next.timeliness.enabled);
      setStartDateField(next.timeliness.start_date_field);
      setEndDateField(next.timeliness.end_date_field);
      setThresholdDays(next.timeliness.threshold_days);
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
      <AdminPageShell title="Application Settings">
        <Alert type="error" title={error} showIcon />
      </AdminPageShell>
    );
  }
  if (!model) return null;

  const chrome = model.chrome;
  const dateOptions = (model.timeliness.date_fields ?? []).map((opt) => ({
    value: opt.value,
    label: displayText(opt.label),
  }));
  const fieldsDisabled = !model.can_edit || !enabled || saving;

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      {error ? <Alert type="error" title={error} showIcon className="admin-page__banner" /> : null}
      <div className="admin-page__body admin-settings-form__body">
        <RecordSectionBlock title={displayText(chrome.section_title)}>
          <div className="admin-settings-form__options">
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={enabled}
                disabled={!model.can_edit || saving}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.enabled_label)}
              </span>
            </label>
          </div>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.start_date_field_label)}
            </span>
            <div className="admin-settings-form__control">
              <Select
                value={startDateField}
                options={dateOptions}
                disabled={fieldsDisabled}
                onChange={setStartDateField}
              />
            </div>
          </div>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.end_date_field_label)}
            </span>
            <div className="admin-settings-form__control">
              <Select
                value={endDateField}
                options={dateOptions}
                disabled={fieldsDisabled}
                onChange={setEndDateField}
              />
            </div>
          </div>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label admin-settings-form__label--strong">
              {displayText(chrome.threshold_days_label)}
            </span>
            <div className="admin-settings-form__control">
              <InputNumber
                min={1}
                value={thresholdDays}
                disabled={fieldsDisabled}
                onChange={(value) => setThresholdDays(typeof value === "number" ? value : 30)}
              />
            </div>
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
