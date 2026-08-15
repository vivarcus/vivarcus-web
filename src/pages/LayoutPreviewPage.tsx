import { Alert, Button, Form, Input, Select, Spin } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useVaultId } from "../hooks/useVaultId";
import { Breadcrumb } from "../components/Breadcrumb";
import { api } from "../api/client";
import type { RecordPageModel } from "../api/types";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import { RecordPageBody, RecordPageShell } from "../components/record/RecordPageShell";
import {
  RecordFieldSections,
  RecordSectionNav,
  shouldShowRecordSectionNav,
} from "../components/RecordSections";
import { scrollToRecordSection, sectionDomId } from "../components/record/recordSectionUtils";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useUi } from "../context/UiContext";
import { recordDisplayName } from "../lib/recordDisplayName";
import { objectNamesFromNav } from "../lib/navObjects";
import { defaultPageMessages, displayText } from "../lib/i18n";

const DEFAULT_SNAPSHOT = '{\n  "name__v": "Preview Record"\n}';

function parseSnapshot(raw: string, invalidMessage: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed: unknown = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(invalidMessage);
  }
  return parsed as Record<string, unknown>;
}

function initialPreviewExpandedSections(sections: RecordPageModel["sections"]): Set<string> {
  return new Set(sections.map((section, index) => sectionDomId(section, index)));
}

export function LayoutPreviewPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const shellNav = useOptionalNavigationContext()?.nav ?? null;
  const [objectOptions, setObjectOptions] = useState<
    Array<{ apiName: string; label: string }>
  >([]);
  const [objectName, setObjectName] = useState("");
  const [objectType, setObjectType] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [snapshotJson, setSnapshotJson] = useState(DEFAULT_SNAPSHOT);
  const [page, setPage] = useState<RecordPageModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionNavCollapsed, setSectionNavCollapsed] = useState(false);

  useEffect(() => {
    if (!shellNav) {
      setObjectOptions([]);
      return;
    }
    const opts = objectNamesFromNav(shellNav);
    setObjectOptions(opts);
    setObjectName((prev) => prev || opts[0]?.apiName || "");
  }, [shellNav]);

  const runPreview = useCallback(
    async (layoutOverride?: string) => {
      if (!vaultId) return;
      const layout = (layoutOverride ?? layoutName).trim();
      const object = objectName.trim();
      if (!object || !layout) {
        setError(displayText(shell.layout_preview_required));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const snapshot = parseSnapshot(snapshotJson, displayText(shell.snapshot_must_be_object));
        const model = await api.previewPage(vaultId, {
          object_api_name: object,
          object_type_api_name: objectType.trim() || undefined,
          layout_api_name: layout,
          record_snapshot: snapshot,
        });
        setPage(model);
        setExpandedSections(initialPreviewExpandedSections(model.sections));
        if (!layoutOverride) {
          setLayoutName(model.selected_layout.api_name);
        }
      } catch (err) {
        setPage(null);
        setError(err instanceof Error ? err.message : displayText(shell.layout_preview_failed));
      } finally {
        setLoading(false);
      }
    },
    [vaultId, objectName, objectType, layoutName, snapshotJson, shell],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const navigateToSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
    scrollToRecordSection(sectionId);
  }, []);

  if (!vaultId) {
    return null;
  }

  function onSubmit() {
    void runPreview();
  }

  const previewTitle = recordDisplayName(page, page?.record_id);

  const sections = page?.sections ?? [];
  const showSectionNav = shouldShowRecordSectionNav(sections);
  const previewBodyClass = [
    "record-page__body",
    showSectionNav && !sectionNavCollapsed ? "record-page__body--with-nav" : "",
    showSectionNav && sectionNavCollapsed ? "record-page__body--nav-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const pageMessages = { ...defaultPageMessages, ...(page?.messages ?? {}) };

  const previewMeta = page ? (
    <>
      {(page.state_label ?? page.state_api_name) && (
        <p className="page-header__meta">
          {displayText(shell.status_prefix)}{" "}
          {displayText(page.state_label, page.state_api_name)}
        </p>
      )}
      <p className="page-header__meta mono">
        {page.object_api_name} · {displayText(page.selected_layout.label, page.selected_layout.api_name)} (
        {page.selected_layout.api_name})
        {page.selected_layout.virtual && ` · ${displayText(shell.virtual_layout_suffix)}`}
      </p>
    </>
  ) : undefined;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Breadcrumb
            items={[
              { label: displayText(shell.vault_home), to: `/` },
              { label: displayText(shell.admin_layout_preview) },
            ]}
          />
          <h1>{displayText(shell.admin_layout_preview)}</h1>
          <p className="page-header__meta">{displayText(shell.layout_preview_subtitle)}</p>
        </div>
      </header>

      <Form
        className="filter-bar filter-bar--stacked"
        layout="vertical"
        requiredMark={false}
        onFinish={onSubmit}
      >
        <Form.Item label={displayText(shell.object_label)}>
          {objectOptions.length > 0 ? (
            <Select
              value={objectName || undefined}
              options={objectOptions.map((opt) => ({
                value: opt.apiName,
                label: `${displayText(opt.label, opt.apiName)} (${opt.apiName})`,
              }))}
              onChange={(value) => setObjectName(value ?? "")}
            />
          ) : (
            <Input
              value={objectName}
              placeholder="study__v"
              onChange={(e) => setObjectName(e.target.value)}
            />
          )}
        </Form.Item>
        <Form.Item label={displayText(shell.object_type_label)}>
          <Input
            value={objectType}
            placeholder={displayText(shell.optional_placeholder)}
            onChange={(e) => setObjectType(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={displayText(shell.layout_api_name_label)} required>
          <Input
            className="mono"
            value={layoutName}
            placeholder="study_detail_page_layout__v"
            onChange={(e) => setLayoutName(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={displayText(shell.record_snapshot_label)}>
          <Input.TextArea
            className="mono"
            rows={5}
            value={snapshotJson}
            onChange={(e) => setSnapshotJson(e.target.value)}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {loading ? displayText(shell.previewing) : displayText(shell.generate_preview)}
          </Button>
        </Form.Item>
      </Form>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      {page && (
        <RecordPageShell
          header={
            <RecordPageHeader
              breadcrumb={[
                { label: displayText(shell.vault_home), to: `/` },
                { label: displayText(shell.admin_layout_preview) },
              ]}
              title={String(previewTitle ?? page.object_api_name)}
              meta={previewMeta}
            />
          }
          alerts={
            <>
              <Alert
                type="info"
                showIcon
                title={`${displayText(pageMessages.preview_readonly)} · ${displayText(shell.preview_mode_prefix)} ${page.record_id}`}
              />
              {loading && (
                <Spin
                  description={displayText(pageMessages.refreshing_detail)}
                  className="page-loading page__loading"
                />
              )}
            </>
          }
          body={
            <RecordPageBody
              className={previewBodyClass}
              mainClassName={loading ? "record-page__main--refreshing" : undefined}
              sectionNav={
                showSectionNav ? (
                  <RecordSectionNav
                    sections={sections}
                    ariaLabel={displayText(pageMessages.section_nav_aria)}
                    onNavigate={navigateToSection}
                    collapsed={sectionNavCollapsed}
                    onToggleCollapse={() => setSectionNavCollapsed((prev) => !prev)}
                    collapseLabel={displayText(pageMessages.collapse_section_nav)}
                    expandLabel={displayText(pageMessages.expand_section_nav)}
                  />
                ) : undefined
              }
            >
              <RecordFieldSections
                vaultId={vaultId}
                sections={sections}
                displayContext={page.display_context}
                messages={page.messages}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
              />
            </RecordPageBody>
          }
        />
      )}
    </div>
  );
}
