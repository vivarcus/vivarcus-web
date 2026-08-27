import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Tooltip,
  Upload,
  message,
} from "antd";
import { EditOutlined, HolderOutlined, InfoCircleOutlined, InboxOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/pages/language-region-settings.css";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type {
  LanguageRegionPageChrome,
  LanguageRegionPatch,
  LanguageRegionSettingsModel,
} from "../api/types";
import {
  displayText,
  displayTextTemplate,
  formatDateFormatRegionalPreviews,
} from "../lib/i18n";
import { downloadTextFile, importDetailsCsv } from "../lib/l10nImportDetails";
import { TranslationAdminSection } from "./TranslationAdminSection";

function statusLabel(chrome: LanguageRegionPageChrome, status: string): string {
  return status === "Active"
    ? displayText(chrome.status_active)
    : displayText(chrome.status_inactive);
}

function timezoneLabel(
  model: LanguageRegionSettingsModel,
  timezone: string,
): string {
  const option = model.timezone.options.find((o) => o.value === timezone);
  return option ? displayText(option.label) : timezone;
}

function dateFormatLabel(
  model: LanguageRegionSettingsModel,
  profile: string,
): string {
  const option = model.date_format.options.find((o) => o.value === profile);
  return option ? displayText(option.label) : profile;
}

type PageEditDraft = {
  timezone: string;
  dateFormat: string;
  multilingualLabels: boolean;
};

function draftFromModel(model: LanguageRegionSettingsModel): PageEditDraft {
  return {
    timezone: model.timezone.current,
    dateFormat: model.date_format.current,
    multilingualLabels: model.multilingual.labels.value,
  };
}

export function LanguageRegionSettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<LanguageRegionSettingsModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [pageEditing, setPageEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<PageEditDraft | null>(null);
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [affectedUsers, setAffectedUsers] = useState(0);

  const [exportCategories, setExportCategories] = useState<string[]>([]);
  const [exportLanguage, setExportLanguage] = useState<string>("");
  const [exportIncludeDiagnostics, setExportIncludeDiagnostics] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    ignored: number;
    error: number;
    unauthorized: number;
    details?: import("../api/types").LanguageRegionImportRowDetail[];
  } | null>(null);
  const [languagesReordering, setLanguagesReordering] = useState(false);
  const [pendingLanguageOrder, setPendingLanguageOrder] = useState<string[]>([]);
  const [dragLanguageCode, setDragLanguageCode] = useState<string | null>(null);

  const chrome = model?.chrome;

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.languageRegionSettings(vaultId);
      setModel(data);
      if (!exportLanguage && data.bulk.active_languages.length > 0) {
        setExportLanguage(data.bulk.active_languages[0].value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, exportLanguage, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (body: LanguageRegionPatch) => {
      if (!vaultId || !chrome) return;
      setSaving(true);
      try {
        const data = await api.patchLanguageRegionSettings(vaultId, body);
        setModel(data);
        message.success(displayText(chrome.settings_saved));
      } catch (err) {
        message.error(err instanceof Error ? err.message : displayText(chrome.save_failed));
        await load();
      } finally {
        setSaving(false);
      }
    },
    [vaultId, load, chrome],
  );

  const filteredLanguages = useMemo(() => {
    if (!model) return [];
    return model.languages.rows.filter((row) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          row.name.toLowerCase().includes(q) ||
          row.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [model, search]);

  const languageRowsByCode = useMemo(() => {
    if (!model) return new Map<string, LanguageRegionSettingsModel["languages"]["rows"][number]>();
    return new Map(model.languages.rows.map((row) => [row.code, row]));
  }, [model]);

  const visibleLanguages = useMemo(() => {
    if (!model) return [];
    if (languagesReordering) {
      return pendingLanguageOrder
        .map((code) => languageRowsByCode.get(code))
        .filter((row): row is NonNullable<typeof row> => row !== undefined);
    }
    return filteredLanguages;
  }, [model, languagesReordering, pendingLanguageOrder, languageRowsByCode, filteredLanguages]);

  const previewFormat = pageEditing && editDraft
    ? editDraft.dateFormat
    : model?.date_format.current ?? "";

  const regionalPreviews = useMemo(() => {
    if (!model || !previewFormat) return [];
    return formatDateFormatRegionalPreviews(previewFormat);
  }, [model, previewFormat]);

  if (!vaultId) return null;

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return (
      <AdminPageShell title="Language & Region">
        <Alert type="error" title={error} />
      </AdminPageShell>
    );
  }

  if (!model || !chrome) return null;

  const settingsModel = model;
  const pageChrome = chrome;
  const canEdit = settingsModel.can_edit;

  function startPageEdit() {
    setEditDraft(draftFromModel(settingsModel));
    setPageEditing(true);
  }

  function cancelPageEdit() {
    setEditDraft(null);
    setPageEditing(false);
  }

  async function savePageEdit() {
    if (!editDraft) return;
    const body: LanguageRegionPatch = {};
    if (editDraft.timezone !== settingsModel.timezone.current) {
      body.vault_timezone = editDraft.timezone;
    }
    if (editDraft.dateFormat !== settingsModel.date_format.current) {
      body.date_format_profile = editDraft.dateFormat;
    }
    if (editDraft.multilingualLabels !== settingsModel.multilingual.labels.value) {
      body.enable_multilingual_labels = editDraft.multilingualLabels;
    }
    if (Object.keys(body).length === 0) {
      cancelPageEdit();
      return;
    }
    if (!vaultId || !chrome) return;
    setSaving(true);
    try {
      const data = await api.patchLanguageRegionSettings(vaultId, body);
      setModel(data);
      message.success(displayText(chrome.settings_saved));
      cancelPageEdit();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(chrome.save_failed));
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startLanguageReorder() {
    setPendingLanguageOrder(settingsModel.languages.rows.map((row) => row.code));
    setLanguagesReordering(true);
    setSearch("");
  }

  function cancelLanguageReorder() {
    setLanguagesReordering(false);
    setPendingLanguageOrder([]);
    setDragLanguageCode(null);
  }

  async function saveLanguageReorder() {
    if (!vaultId || !chrome || pendingLanguageOrder.length === 0) return;
    setSaving(true);
    try {
      const data = await api.patchLanguageRegionSettings(vaultId, {
        language_order: pendingLanguageOrder,
      });
      setModel(data);
      message.success(displayText(chrome.language_order_updated));
      cancelLanguageReorder();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(chrome.save_failed));
      await load();
    } finally {
      setSaving(false);
    }
  }

  function moveLanguage(dragCode: string, targetCode: string) {
    if (dragCode === targetCode) return;
    setPendingLanguageOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragCode);
      const to = next.indexOf(targetCode);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragCode);
      return next;
    });
  }

  async function saveLanguageStatus(code: string, status: "Active" | "Inactive") {
    if (!vaultId) return;
    if (status === "Inactive") {
      const prep = await api.prepareLanguageDeactivation(vaultId, code);
      if (prep.blocked) {
        message.error(
          displayText(prep.blocked_reason, displayText(pageChrome.cannot_deactivate_language)),
        );
        return;
      }
      if (prep.requires_confirmation) {
        setAffectedUsers(prep.affected_users);
        setEditingLang(code);
        setEditStatus("Inactive");
        setConfirmDeactivate(false);
        return;
      }
    }
    await patch({ language_code: code, language_status: status });
    setEditingLang(null);
  }

  async function confirmDeactivation() {
    if (!editingLang || !confirmDeactivate) return;
    await patch({ language_code: editingLang, language_status: "Inactive" });
    setEditingLang(null);
    setConfirmDeactivate(false);
  }

  async function handleExport() {
    if (!vaultId || exportCategories.length === 0 || !exportLanguage) {
      message.warning(displayText(pageChrome.export_select_warning));
      return;
    }
    try {
      const blob = await api.exportLanguageRegionTranslations(vaultId, {
        language: exportLanguage,
        categories: exportCategories,
        include_diagnostics: exportIncludeDiagnostics,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `translations_${exportLanguage}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(pageChrome.export_failed));
    }
  }

  async function handleImport() {
    if (!vaultId || importFiles.length === 0) {
      message.warning(displayText(pageChrome.import_upload_warning));
      return;
    }
    setSaving(true);
    try {
      const result = await api.importLanguageRegionTranslations(vaultId, importFiles);
      setImportResult(result);
      message.success(displayText(pageChrome.import_completed));
      setImportFiles([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(pageChrome.import_failed));
    } finally {
      setSaving(false);
    }
  }

  function onFileSelect(files: FileList | File[] | null) {
    if (!files || !model) return;
    const maxFiles = model.bulk.max_files;
    const names = new Set(importFiles.map((f) => f.name));
    const next = [...importFiles];
    for (const file of Array.from(files)) {
      if (names.has(file.name)) {
        message.error(displayTextTemplate(pageChrome.duplicate_file_name, { name: file.name }));
        return;
      }
      if (next.length >= maxFiles) {
        message.error(displayTextTemplate(pageChrome.max_files_error, { max: maxFiles }));
        return;
      }
      next.push(file);
      names.add(file.name);
    }
    setImportFiles(next);
  }

  const editingRow = editingLang
    ? model.languages.rows.find((r) => r.code === editingLang)
    : undefined;

  const vaultInfoHeaderExtra =
    canEdit && !pageEditing && !languagesReordering ? (
      <Button
        type="text"
        size="small"
        className="language-region-settings__edit-btn"
        icon={<EditOutlined aria-hidden="true" />}
        disabled={saving}
        onClick={startPageEdit}
      >
        {displayText(chrome.edit_button)}
      </Button>
    ) : null;

  const languagesHeaderExtra =
    canEdit && !pageEditing && !languagesReordering ? (
      <Button
        type="text"
        size="small"
        className="language-region-settings__edit-btn"
        disabled={saving}
        onClick={startLanguageReorder}
      >
        {displayText(chrome.reorder_button)}
      </Button>
    ) : languagesReordering ? (
      <span className="language-region-settings__inline-actions">
        <Button size="small" disabled={saving} onClick={cancelLanguageReorder}>
          {displayText(chrome.cancel_button)}
        </Button>
        <Button type="primary" size="small" loading={saving} onClick={() => void saveLanguageReorder()}>
          {displayText(chrome.save_button)}
        </Button>
      </span>
    ) : null;

  return (
    <AdminPageShell
      className={`language-region-settings${pageEditing ? " language-region-settings--editing" : ""}`}
      title={displayText(chrome.page_title)}
    >
      <div className="admin-page__body admin-settings-form__body">
        <AdminPageSection
          title={displayText(chrome.base_settings_section_title)}
          actions={vaultInfoHeaderExtra}
        >
          <div className="language-region-settings__form-grid">
            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.base_language_label)}
              </span>
              <span className="language-region-settings__field-value">
                {model.base.base_language.label}
              </span>
            </div>
            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.base_locale_label)}
              </span>
              <span className="language-region-settings__field-value">
                {model.base.base_locale.label}
              </span>
            </div>
            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.vault_timezone_label)}
              </span>
              {pageEditing && editDraft ? (
                <div className="admin-settings-form__control">
                  <Select
                    value={editDraft.timezone}
                    disabled={!canEdit}
                    loading={saving}
                    options={model.timezone.options.map((o) => ({
                      value: o.value,
                      label: displayText(o.label),
                    }))}
                    onChange={(tz) => setEditDraft({ ...editDraft, timezone: tz })}
                  />
                </div>
              ) : (
                <span className="language-region-settings__field-value">
                  {timezoneLabel(model, model.timezone.current)}
                </span>
              )}
            </div>
          </div>
          {pageEditing ? (
            <p className="admin-settings-form__help">
              {displayText(model.timezone.help_text)}
            </p>
          ) : null}
        </AdminPageSection>


        <AdminPageSection title={displayText(chrome.date_format_section_title)}>
          <div className="admin-settings-form__row">
            <span className="admin-settings-form__label">
              {displayText(chrome.date_format_label)}
            </span>
            {pageEditing && editDraft ? (
              <div className="admin-settings-form__control">
                <Select
                  value={editDraft.dateFormat}
                  disabled={!canEdit}
                  options={model.date_format.options.map((o) => ({
                    value: o.value,
                    label: displayText(o.label),
                  }))}
                  onChange={(value) => setEditDraft({ ...editDraft, dateFormat: value })}
                />
              </div>
            ) : (
              <span className="language-region-settings__field-value">
                {dateFormatLabel(model, model.date_format.current)}
              </span>
            )}
          </div>
          <div className="language-region-settings__preview-table" role="table">
            <div className="language-region-settings__preview-header" role="row">
              <span role="columnheader" />
              <span role="columnheader">{displayText(chrome.preview_label)}</span>
            </div>
            {regionalPreviews.map((row) => (
              <div key={row.code} className="language-region-settings__preview-row" role="row">
                <span className="language-region-settings__preview-region" role="cell">
                  {row.label}
                </span>
                <span className="language-region-settings__preview-value" role="cell">
                  {row.preview}
                </span>
              </div>
            ))}
          </div>
          {pageEditing ? (
            <p className="admin-settings-form__help">
              {displayText(model.date_format.help_text)}
            </p>
          ) : null}
        </AdminPageSection>

        <AdminPageSection title={displayText(chrome.multilingual_section_title)}>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label" />
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={model.multilingual.document_handling.value}
                disabled={!pageEditing || !canEdit || model.multilingual.document_handling.disabled}
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.document_handling_label)}
                <Tooltip
                  title={
                    displayText(model.multilingual.document_handling.disabled_reason) ||
                    displayText(model.multilingual.document_handling.info)
                  }
                >
                  <InfoCircleOutlined aria-hidden />
                </Tooltip>
              </span>
            </label>
          </div>
          <div className="admin-settings-form__row admin-settings-form__row--start">
            <span className="admin-settings-form__label" />
            <label className="admin-settings-form__toggle">
              <Checkbox
                checked={
                  pageEditing && editDraft
                    ? editDraft.multilingualLabels
                    : model.multilingual.labels.value
                }
                disabled={
                  !pageEditing ||
                  !canEdit ||
                  model.multilingual.labels.disabled
                }
                onChange={(e) => {
                  if (editDraft) {
                    setEditDraft({ ...editDraft, multilingualLabels: e.target.checked });
                  }
                }}
              />
              <span className="admin-settings-form__toggle-label">
                {displayText(chrome.labels_toggle_label)}
                {model.multilingual.labels.info ? (
                  <Tooltip title={displayText(model.multilingual.labels.info)}>
                    <InfoCircleOutlined aria-hidden />
                  </Tooltip>
                ) : null}
              </span>
            </label>
          </div>
        </AdminPageSection>

        {pageEditing ? (
          <footer className="admin-settings-form__footer-actions">
            <Button type="link" disabled={saving} onClick={cancelPageEdit}>
              {displayText(chrome.cancel_button)}
            </Button>
            <Button type="primary" loading={saving} onClick={() => void savePageEdit()}>
              {displayText(chrome.save_button)}
            </Button>
          </footer>
        ) : null}

        <AdminPageSection
          title={displayText(chrome.languages_section_title)}
          actions={languagesHeaderExtra}
        >
          {!languagesReordering ? (
            <div className="admin-settings-form__toolbar">
              <Input
                className="language-region-settings__toolbar-search"
                placeholder={displayText(chrome.search_languages_placeholder)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </div>
          ) : (
            <p className="language-region-settings__reorder-hint">
              {displayText(chrome.reorder_hint)}
            </p>
          )}
          <ul
            className={
              languagesReordering
                ? "language-region-settings__language-list language-region-settings__language-list--reorder"
                : "language-region-settings__language-list"
            }
          >
            {visibleLanguages.map((row) => (
              <li
                key={row.code}
                className="language-region-settings__language-row"
                draggable={languagesReordering}
                onDragStart={() => setDragLanguageCode(row.code)}
                onDragEnd={() => setDragLanguageCode(null)}
                onDragOver={(event) => {
                  if (languagesReordering) event.preventDefault();
                }}
                onDrop={() => {
                  if (dragLanguageCode) {
                    moveLanguage(dragLanguageCode, row.code);
                  }
                  setDragLanguageCode(null);
                }}
              >
                {languagesReordering ? (
                  <span className="language-region-settings__drag-handle" aria-hidden>
                    <HolderOutlined />
                  </span>
                ) : null}
                <span className="language-region-settings__language-name">
                  {row.name}
                  {row.is_base_language ? (
                    <span className="language-region-settings__language-default">
                      {" "}
                      {displayText(chrome.default_value_suffix)}
                    </span>
                  ) : null}
                </span>
                {!languagesReordering && canEdit && !pageEditing ? (
                  <button
                    type="button"
                    className={
                      row.status === "Active"
                        ? "language-region-settings__status-btn language-region-settings__status-btn--active"
                        : "language-region-settings__status-btn language-region-settings__status-btn--inactive"
                    }
                    onClick={() => {
                      setEditingLang(row.code);
                      setEditStatus(row.status as "Active" | "Inactive");
                      setConfirmDeactivate(false);
                      setAffectedUsers(0);
                    }}
                  >
                    {statusLabel(chrome, row.status)}
                  </button>
                ) : (
                  <span
                    className={
                      row.status === "Active"
                        ? "language-region-settings__status language-region-settings__status--active"
                        : "language-region-settings__status language-region-settings__status--inactive"
                    }
                  >
                    {statusLabel(chrome, row.status)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </AdminPageSection>

        <AdminPageSection title={displayText(chrome.bulk_translation_title)}>
          <div className="language-region-settings__bulk-stack">
            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.select_items_to_translate_label)}
              </span>
              <div className="admin-settings-form__control">
                <Select
                  mode="multiple"
                  placeholder={displayText(chrome.select_categories_placeholder)}
                  value={exportCategories}
                  disabled={!model.bulk.can_export || pageEditing}
                  options={model.bulk.resource_categories.map((c) => ({
                    value: c.value,
                    label: displayText(c.label),
                  }))}
                  onChange={setExportCategories}
                />
              </div>
            </div>

            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.export_translation_file_label)}
              </span>
              <div className="language-region-settings__bulk-inline">
                <Select
                  value={exportLanguage}
                  disabled={!model.bulk.can_export || pageEditing}
                  options={model.bulk.active_languages.map((l) => ({
                    value: l.value,
                    label: displayText(l.label),
                  }))}
                  onChange={setExportLanguage}
                />
                <Checkbox
                  checked={exportIncludeDiagnostics}
                  disabled={!model.bulk.can_export || pageEditing}
                  onChange={(e) => setExportIncludeDiagnostics(e.target.checked)}
                >
                  {displayText(chrome.export_include_diagnostics)}
                </Checkbox>
                <Button
                  type="primary"
                  disabled={!model.bulk.can_export || pageEditing}
                  onClick={() => void handleExport()}
                >
                  {displayText(chrome.export_button)}
                </Button>
              </div>
            </div>

            <div className="admin-settings-form__row">
              <span className="admin-settings-form__label">
                {displayText(chrome.import_translation_file_label)}
              </span>
              <div className="language-region-settings__bulk-import">
                <Upload.Dragger
                  className="language-region-settings__upload-dragger"
                  multiple
                  accept=".csv,text/csv"
                  disabled={!model.bulk.can_import || pageEditing}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    onFileSelect([file]);
                    return false;
                  }}
                >
                  <p className="language-region-settings__upload-icon">
                    <InboxOutlined aria-hidden />
                  </p>
                  <p className="language-region-settings__upload-hint">
                    {displayText(chrome.import_drop_hint)}
                  </p>
                </Upload.Dragger>
                {importFiles.length > 0 ? (
                  <ul className="language-region-settings__file-list">
                    {importFiles.map((f) => (
                      <li key={f.name}>
                        <span>
                          {f.name} ({Math.round(f.size / 1024)} KB)
                        </span>
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            setImportFiles(importFiles.filter((x) => x.name !== f.name))
                          }
                        >
                          {displayText(chrome.remove_file_button)}
                        </Button>
                      </li>
                    ))}
                    <li>
                      <Button type="link" size="small" onClick={() => setImportFiles([])}>
                        {displayText(chrome.clear_all_button)}
                      </Button>
                    </li>
                  </ul>
                ) : null}
                <div className="language-region-settings__bulk-actions">
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={!model.bulk.can_import || importFiles.length === 0 || pageEditing}
                    onClick={() => void handleImport()}
                  >
                    {displayText(chrome.import_button)}
                  </Button>
                </div>
                {importResult ? (
                  <div className="language-region-settings__import-result">
                    <p>
                      {displayTextTemplate(chrome.import_success_rows, {
                        count: importResult.success,
                      })}
                      {importResult.success > 0 ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            downloadTextFile(
                              "import-success.csv",
                              importDetailsCsv(importResult.details ?? [], "success"),
                            )
                          }
                        >
                          {displayText(chrome.download_details)}
                        </Button>
                      ) : null}
                    </p>
                    <p>
                      {displayTextTemplate(chrome.import_ignored_rows, {
                        count: importResult.ignored,
                        unauthorized: importResult.unauthorized,
                      })}
                      {importResult.ignored > 0 ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            downloadTextFile(
                              "import-ignored.csv",
                              importDetailsCsv(importResult.details ?? [], "ignored"),
                            )
                          }
                        >
                          {displayText(chrome.download_details)}
                        </Button>
                      ) : null}
                    </p>
                    <p>
                      {displayTextTemplate(chrome.import_error_rows, {
                        count: importResult.error,
                      })}
                      {importResult.error > 0 ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            downloadTextFile(
                              "import-error.csv",
                              importDetailsCsv(importResult.details ?? [], "error"),
                            )
                          }
                        >
                          {displayText(chrome.download_details)}
                        </Button>
                      ) : null}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </AdminPageSection>

        <TranslationAdminSection
          vaultId={vaultId}
          model={settingsModel}
          chrome={pageChrome}
          disabled={pageEditing}
        />
      </div>

      <Modal
        title={displayText(chrome.edit_language_modal_title)}
        open={editingLang !== null && affectedUsers === 0}
        onCancel={() => setEditingLang(null)}
        onOk={() => {
          if (!editingLang) return;
          void saveLanguageStatus(editingLang, editStatus);
        }}
        okButtonProps={{
          disabled: editStatus === "Inactive" && !editingRow?.can_deactivate,
        }}
      >
        {editingLang && editingRow ? (
          <>
            <p>
              <strong>{editingRow.name}</strong>
            </p>
            <Select
              className="admin-page__full-width"
              value={editStatus}
              options={[
                { value: "Active", label: displayText(chrome.status_active) },
                {
                  value: "Inactive",
                  label: displayText(chrome.status_inactive),
                  disabled: editingRow.is_english || !editingRow.can_deactivate,
                },
              ]}
              onChange={(v) => setEditStatus(v)}
            />
            {editingRow.deactivate_blocked_reason ? (
              <Alert
                type="error"
                className="admin-page__note-spaced"
                title={displayText(editingRow.deactivate_blocked_reason)}
              />
            ) : null}
            {editingRow.active_users > 0 ? (
              <p className="language-region-settings__modal-meta">
                {displayText(chrome.active_users_column)}: {editingRow.active_users}
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>

      <Modal
        title={displayText(chrome.deactivate_language_modal_title)}
        open={editingLang !== null && affectedUsers > 0}
        onCancel={() => {
          setEditingLang(null);
          setAffectedUsers(0);
        }}
        onOk={() => void confirmDeactivation()}
        okButtonProps={{ disabled: !confirmDeactivate }}
      >
        <p>{displayTextTemplate(chrome.deactivate_language_body, { count: affectedUsers })}</p>
        <Checkbox
          checked={confirmDeactivate}
          onChange={(e) => setConfirmDeactivate(e.target.checked)}
        >
          {displayTextTemplate(chrome.deactivate_confirm_checkbox, { count: affectedUsers })}
        </Checkbox>
      </Modal>
    </AdminPageShell>
  );
}
