import { Alert, Button, Checkbox, Popconfirm, Select, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/pages/search-settings.css";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type { SearchSettingsModel } from "../api/types";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";

type SettingsDraft = {
  strict_matching_enabled: boolean;
  auto_filters_enabled: boolean;
  multilingual_object_search_enabled: boolean;
  export_search_criteria: boolean;
};

function draftFromModel(model: SearchSettingsModel): SettingsDraft {
  return {
    strict_matching_enabled: model.settings.strict_matching_enabled,
    auto_filters_enabled: model.settings.auto_filters_enabled,
    multilingual_object_search_enabled: model.settings.multilingual_object_search_enabled,
    export_search_criteria: model.settings.export_search_criteria,
  };
}

function draftsEqual(a: SettingsDraft, b: SettingsDraft): boolean {
  return (
    a.strict_matching_enabled === b.strict_matching_enabled &&
    a.auto_filters_enabled === b.auto_filters_enabled &&
    a.multilingual_object_search_enabled === b.multilingual_object_search_enabled &&
    a.export_search_criteria === b.export_search_criteria
  );
}

export function SearchSettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<SearchSettingsModel | null>(null);
  const [savedDraft, setSavedDraft] = useState<SettingsDraft | null>(null);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thesaurusLanguage, setThesaurusLanguage] = useState("");
  const [importingThesaurus, setImportingThesaurus] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const isDirty = useMemo(() => {
    if (!savedDraft || !draft) return false;
    return !draftsEqual(savedDraft, draft);
  }, [savedDraft, draft]);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchSettings(vaultId);
      const nextDraft = draftFromModel(data);
      setModel(data);
      setSavedDraft(nextDraft);
      setDraft(nextDraft);
      setThesaurusLanguage((prev) => {
        const languages = data.thesaurus.languages;
        if (prev && languages.some((item) => item.value === prev)) {
          return prev;
        }
        return data.thesaurus.default_language || languages[0]?.value || "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
      setSavedDraft(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!vaultId || !model?.reindex.in_progress) return;
    const timer = window.setInterval(() => {
      void api.searchReindexStatus(vaultId).then((status) => {
        setModel((prev) => (prev ? { ...prev, reindex: status } : prev));
      }).catch(() => {
        // ignore polling errors
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [vaultId, model?.reindex.in_progress]);

  const resetDraft = () => {
    if (savedDraft) setDraft(savedDraft);
  };

  const save = async () => {
    if (!vaultId || !draft) return;
    setSaving(true);
    try {
      const next = await api.patchSearchSettings(vaultId, {
        strict_matching_enabled: draft.strict_matching_enabled,
        auto_filters_enabled: draft.auto_filters_enabled,
        multilingual_object_search_enabled: draft.multilingual_object_search_enabled,
        export_search_criteria: draft.export_search_criteria,
      });
      const nextDraft = draftFromModel(next);
      setModel(next);
      setSavedDraft(nextDraft);
      setDraft(nextDraft);
      message.success(displayText(next.chrome.save_label));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setSaving(false);
    }
  };

  const exportThesaurus = async () => {
    if (!vaultId || !model || !thesaurusLanguage) return;
    try {
      const blob = await api.exportSearchThesaurus(vaultId, thesaurusLanguage);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thesaurus_${thesaurusLanguage}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    }
  };

  const importThesaurus = async (file: File) => {
    if (!vaultId || !model || !thesaurusLanguage) return;
    setImportingThesaurus(true);
    try {
      const result = await api.importSearchThesaurus(vaultId, thesaurusLanguage, file);
      message.success(
        `${displayText(model.chrome.thesaurus_import_success_label)} (${result.imported})`,
      );
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setImportingThesaurus(false);
    }
  };

  const triggerReindex = async () => {
    if (!vaultId) return;
    setReindexing(true);
    try {
      const next = await api.enqueueSearchMetadataReindex(vaultId);
      setModel(next);
      message.success(displayText(next.chrome.reindex_in_progress_label));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setReindexing(false);
    }
  };

  if (!vaultId) return null;

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return <Alert type="error" title={error} showIcon />;
  }

  if (!model || !draft) return null;

  const chrome = model.chrome;
  const reindexCounts = [
    displayTextTemplate(
      chrome.reindex_pending_label,
      { count: model.reindex.pending },
      `${model.reindex.pending} pending`,
    ),
    displayTextTemplate(
      chrome.reindex_running_label,
      { count: model.reindex.running },
      `${model.reindex.running} running`,
    ),
    displayTextTemplate(
      chrome.reindex_completed_label,
      { count: model.reindex.completed },
      `${model.reindex.completed} completed`,
    ),
  ];
  if (model.reindex.failed > 0) {
    reindexCounts.push(
      displayTextTemplate(
        chrome.reindex_failed_label,
        { count: model.reindex.failed },
        `${model.reindex.failed} failed`,
      ),
    );
  }

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      <div className="admin-page__body admin-settings-form__body">
        <RecordSectionBlock title={displayText(chrome.match_settings_title)}>
          <div className="admin-settings-form__options">
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={draft.strict_matching_enabled}
                disabled={saving}
                onChange={(event) =>
                  setDraft({ ...draft, strict_matching_enabled: event.target.checked })
                }
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.strict_matching_label)}
              </span>
            </label>
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={draft.auto_filters_enabled}
                disabled={saving}
                onChange={(event) =>
                  setDraft({ ...draft, auto_filters_enabled: event.target.checked })
                }
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.auto_filters_label)}
              </span>
            </label>
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={draft.multilingual_object_search_enabled}
                disabled={
                  model.settings.multilingual_object_search_disabled ||
                  model.reindex.in_progress ||
                  saving
                }
                onChange={(event) =>
                  setDraft({ ...draft, multilingual_object_search_enabled: event.target.checked })
                }
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.multilingual_object_search_label)}
              </span>
            </label>
            {model.settings.multilingual_object_search_hint ? (
              <p className="admin-settings-form__hint">
                {displayText(model.settings.multilingual_object_search_hint)}
              </p>
            ) : null}
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={draft.export_search_criteria}
                disabled={saving}
                onChange={(event) =>
                  setDraft({ ...draft, export_search_criteria: event.target.checked })
                }
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.export_search_criteria_label)}
              </span>
            </label>
          </div>
          {isDirty ? (
            <footer className="admin-settings-form__footer-actions">
              <Button type="link" disabled={saving} onClick={resetDraft}>
                {displayText(chrome.cancel_label, "Cancel")}
              </Button>
              <Button type="primary" loading={saving} onClick={() => void save()}>
                {displayText(chrome.save_label)}
              </Button>
            </footer>
          ) : null}
        </RecordSectionBlock>

        <RecordSectionBlock title={displayText(chrome.thesaurus_title)}>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label">
              {displayText(chrome.thesaurus_language_label)}
            </span>
            <div className="admin-settings-form__control">
              <Select
                value={thesaurusLanguage || undefined}
                options={model.thesaurus.languages.map((lang) => ({
                  value: lang.value,
                  label: displayText(lang.label),
                }))}
                onChange={setThesaurusLanguage}
                disabled={model.thesaurus.languages.length === 0}
              />
            </div>
          </div>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label" />
            <div className="search-settings__thesaurus-actions">
              <Button disabled={!thesaurusLanguage} onClick={() => void exportThesaurus()}>
                {displayText(chrome.thesaurus_export_label)}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="search-settings__file-input"
                disabled={!thesaurusLanguage || importingThesaurus}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importThesaurus(file);
                }}
              />
              <Button
                disabled={!thesaurusLanguage}
                loading={importingThesaurus}
                onClick={() => importInputRef.current?.click()}
              >
                {displayText(chrome.thesaurus_import_label)}
              </Button>
            </div>
          </div>
        </RecordSectionBlock>

        <RecordSectionBlock title={displayText(chrome.reindex_title)}>
          <div className="search-settings__reindex-status">
            <span className="search-settings__reindex-status-label">
              {displayText(chrome.reindex_status_label)}:
            </span>
            <span className="search-settings__reindex-counts">
              {reindexCounts.map((label, index) => (
                <span
                  key={label}
                  className={
                    index === reindexCounts.length - 1 && model.reindex.failed > 0
                      ? "search-settings__reindex-count search-settings__reindex-count--failed"
                      : "search-settings__reindex-count"
                  }
                >
                  {label}
                </span>
              ))}
            </span>
          </div>
          {model.reindex.in_progress ? (
            <p className="search-settings__reindex-progress">
              {displayText(chrome.reindex_in_progress_label)}
            </p>
          ) : null}
          <Popconfirm
            title={displayText(chrome.reindex_confirm_title, "Reindex document metadata?")}
            description={displayText(
              chrome.reindex_confirm_body,
              "This queues a background job to rebuild search indexes for document metadata. Existing search results may be stale until the job completes.",
            )}
            okText={displayText(model.reindex.trigger_label)}
            cancelText={displayText(chrome.cancel_label, "Cancel")}
            onConfirm={() => void triggerReindex()}
          >
            <Button loading={reindexing} disabled={model.reindex.in_progress}>
              {displayText(model.reindex.trigger_label)}
            </Button>
          </Popconfirm>
        </RecordSectionBlock>
      </div>
    </AdminPageShell>
  );
}
