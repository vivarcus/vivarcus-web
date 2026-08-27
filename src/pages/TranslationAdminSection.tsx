import { Button, Checkbox, Input, Select, Table, Tag, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type {
  LanguageRegionPageChrome,
  LanguageRegionSettingsModel,
  LanguageRegionTranslationRow,
} from "../api/types";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { displayText } from "../lib/i18n";

const PAGE_SIZE = 50;

type TranslationAdminSectionProps = {
  vaultId: string;
  model: LanguageRegionSettingsModel;
  chrome: LanguageRegionPageChrome;
  disabled: boolean;
};

export function TranslationAdminSection({
  vaultId,
  model,
  chrome,
  disabled,
}: TranslationAdminSectionProps) {
  const defaultLanguage = model.bulk.active_languages[0]?.value ?? "";
  const [language, setLanguage] = useState(defaultLanguage);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<LanguageRegionTranslationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(model.can_edit);

  const load = useCallback(async () => {
    if (!vaultId || !language) return;
    setLoading(true);
    try {
      const data = await api.listLanguageRegionTranslations(vaultId, {
        language,
        category,
        q: query.trim() || undefined,
        stale: staleOnly || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setRows(data.rows);
      setTotal(data.total);
      setCanEdit(data.can_edit);
      setDrafts({});
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(chrome.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, language, category, query, staleOnly, page, chrome.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = useCallback(
    async (row: LanguageRegionTranslationRow, translated: string) => {
      setSavingKey(row.key);
      try {
        const saved = await api.patchLanguageRegionTranslation(vaultId, {
          key: row.key,
          language: row.language,
          translated_text: translated,
        });
        setRows((current) =>
          current.map((item) => (item.key === saved.key ? { ...item, ...saved } : item)),
        );
        setDrafts((current) => {
          const next = { ...current };
          delete next[row.key];
          return next;
        });
        message.success(displayText(chrome.translation_saved));
      } catch (err) {
        message.error(err instanceof Error ? err.message : displayText(chrome.save_failed));
      } finally {
        setSavingKey(null);
      }
    },
    [vaultId, chrome.translation_saved, chrome.save_failed],
  );

  const columns = useMemo(
    () => [
      {
        title: displayText(chrome.translation_type_column),
        dataIndex: "type",
        key: "type",
        width: 110,
      },
      {
        title: displayText(chrome.translation_key_column),
        dataIndex: "key",
        key: "key",
        ellipsis: true,
      },
      {
        title: displayText(chrome.translation_base_column),
        dataIndex: "base_label",
        key: "base_label",
        ellipsis: true,
      },
      {
        title: displayText(chrome.translation_translated_column),
        key: "translated_label",
        render: (_: unknown, row: LanguageRegionTranslationRow) => (
          <Input
            value={drafts[row.key] ?? row.translated_label}
            disabled={disabled || !canEdit}
            onChange={(e) =>
              setDrafts((current) => ({ ...current, [row.key]: e.target.value }))
            }
          />
        ),
      },
      {
        title: displayText(chrome.translation_stale_column),
        key: "stale",
        width: 100,
        render: (_: unknown, row: LanguageRegionTranslationRow) =>
          row.stale ? (
            <Tag color="warning">{displayText(chrome.translation_stale_yes)}</Tag>
          ) : (
            <span className="language-region-settings__stale-current">
              {displayText(chrome.translation_stale_no)}
            </span>
          ),
      },
      {
        title: displayText(chrome.translation_base_updated_column),
        dataIndex: "base_updated_at",
        key: "base_updated_at",
        width: 170,
        ellipsis: true,
        render: (value: string | undefined) => formatAdminTime(value),
      },
      {
        title: displayText(chrome.translation_updated_column),
        dataIndex: "translation_updated_at",
        key: "translation_updated_at",
        width: 170,
        ellipsis: true,
        render: (value: string | undefined) => formatAdminTime(value),
      },
      {
        title: displayText(chrome.save_button),
        key: "save",
        width: 96,
        render: (_: unknown, row: LanguageRegionTranslationRow) => {
          const next = (drafts[row.key] ?? row.translated_label).trim();
          const dirty = next !== row.translated_label.trim() || Boolean(row.stale);
          return (
            <Button
              type="link"
              size="small"
              loading={savingKey === row.key}
              disabled={disabled || !canEdit || !dirty || next === ""}
              onClick={() => void saveRow(row, next)}
            >
              {displayText(chrome.save_button)}
            </Button>
          );
        },
      },
    ],
    [chrome, drafts, disabled, canEdit, savingKey, saveRow],
  );

  return (
    <AdminPageSection title={displayText(chrome.translation_admin_title)}>
      <div className="language-region-settings__admin-toolbar">
        <Select
          className="language-region-settings__admin-filter"
          value={language || undefined}
          options={model.bulk.active_languages.map((item) => ({
            value: item.value,
            label: displayText(item.label),
          }))}
          onChange={(value) => {
            setLanguage(value);
            setPage(1);
          }}
        />
        <Select
          className="language-region-settings__admin-filter"
          allowClear
          placeholder={displayText(chrome.resource_categories_label)}
          value={category}
          options={model.bulk.resource_categories.map((item) => ({
            value: item.value,
            label: displayText(item.label),
          }))}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
        />
        <Input.Search
          className="language-region-settings__admin-search"
          allowClear
          placeholder={displayText(chrome.translation_admin_search_placeholder)}
          onSearch={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Checkbox
          checked={staleOnly}
          onChange={(e) => {
            setStaleOnly(e.target.checked);
            setPage(1);
          }}
        >
          {displayText(chrome.translation_stale_only)}
        </Checkbox>
      </div>
      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: displayText(chrome.translation_empty) }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </AdminPageSection>
  );
}

function formatAdminTime(value?: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "—";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return raw;
  return new Date(parsed).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}
