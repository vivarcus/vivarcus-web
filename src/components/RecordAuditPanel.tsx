import { Alert, Button, Dropdown, Form, Input, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuditExportButton } from "./AuditExportButton";
import { AuditGrid } from "./AuditGrid";
import { useUi } from "../context/UiContext";
import { useAuditPanelLoader } from "../hooks/useAuditPanelLoader";
import { auditPanelRows } from "../lib/auditPanel";
import { buildExportQuery, localDateTimeInputToRFC3339 } from "../lib/auditExport";
import {
  auditResultsSummaryRange,
  enrichRecordAuditRows,
} from "../lib/recordAuditDisplay";
import { defaultAuditChrome, displayText, displayTextTemplate, type AuditChrome } from "../lib/i18n";

export type RecordAuditFilters = {
  user: string;
  action: string;
  timeFrom: string;
  timeTo: string;
};

type FilterDraft = {
  timeRange: "all" | "range";
  timeFrom: string;
  timeTo: string;
  user: string;
  action: string;
  showUserFilter: boolean;
  showActionFilter: boolean;
};

const emptyAppliedFilters: RecordAuditFilters = {
  user: "",
  action: "",
  timeFrom: "",
  timeTo: "",
};

const defaultDraft: FilterDraft = {
  timeRange: "all",
  timeFrom: "",
  timeTo: "",
  user: "",
  action: "",
  showUserFilter: false,
  showActionFilter: false,
};

function filtersToQuery(filters: RecordAuditFilters) {
  return {
    user: filters.user.trim() || undefined,
    action: filters.action.trim() || undefined,
    time_from: localDateTimeInputToRFC3339(filters.timeFrom),
    time_to: localDateTimeInputToRFC3339(filters.timeTo),
  };
}

function draftToApplied(draft: FilterDraft): RecordAuditFilters {
  return {
    user: draft.showUserFilter ? draft.user : "",
    action: draft.showActionFilter ? draft.action : "",
    timeFrom: draft.timeRange === "range" ? draft.timeFrom : "",
    timeTo: draft.timeRange === "range" ? draft.timeTo : "",
  };
}

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  recordCell?: string;
  onChromeChange?: (chrome: AuditChrome) => void;
};

export function RecordAuditPanel({
  vaultId,
  objectName,
  recordId,
  recordCell,
  onChromeChange,
}: Props) {
  const { shell, displayContext } = useUi();
  const [draft, setDraft] = useState<FilterDraft>(defaultDraft);
  const [appliedFilters, setAppliedFilters] = useState<RecordAuditFilters>(emptyAppliedFilters);

  const fetchPanel = useCallback(
    async (token?: string) =>
      api.recordAuditPanel(vaultId, objectName, recordId, {
        page_token: token,
        page_size: 50,
        ...filtersToQuery(appliedFilters),
        timezone: displayContext.timezone,
        date_format_profile: displayContext.date_format_profile,
        locale: displayContext.locale,
      }),
    [vaultId, objectName, recordId, appliedFilters, displayContext],
  );

  const { panel, pageToken, error, loading, load, auditChrome } = useAuditPanelLoader({
    fetchPanel,
    loadFailedMessage: displayText(defaultAuditChrome.load_records_failed),
  });

  useEffect(() => {
    onChromeChange?.(auditChrome);
  }, [auditChrome, onChromeChange]);

  const exportQuery = useMemo(
    () =>
      buildExportQuery("record_object", {
        objectName,
        recordId,
        ...filtersToQuery(appliedFilters),
        displayContext,
      }),
    [objectName, recordId, appliedFilters, displayContext],
  );

  const rawRows = panel ? auditPanelRows(panel) : [];
  const rows = enrichRecordAuditRows(rawRows, recordCell, auditChrome);
  const resultCount = rows.length;
  const summaryRange = auditResultsSummaryRange(
    rows,
    appliedFilters.timeFrom,
    appliedFilters.timeTo,
  );

  function applyFilters() {
    setAppliedFilters(draftToApplied(draft));
  }

  return (
    <div className="record-audit-panel record-audit-panel--veeva">
      <section className="record-audit-panel__filters">
        <Form className="record-audit-panel__filter-form" onFinish={applyFilters}>
          <div className="record-audit-panel__filter-row">
            <Select
              className="record-audit-panel__filter-kind"
              value="timestamp"
              options={[{ value: "timestamp", label: displayText(auditChrome.filter_timestamp) }]}
            />
            <Select
              className="record-audit-panel__filter-op"
              value={draft.timeRange}
              onChange={(value: "all" | "range") =>
                setDraft((prev) => ({ ...prev, timeRange: value }))
              }
              options={[
                { value: "all", label: displayText(auditChrome.filter_all) },
                { value: "range", label: displayText(auditChrome.filter_in_range) },
              ]}
            />
            {draft.timeRange === "range" && (
              <>
                <Input
                  type="datetime-local"
                  className="record-audit-panel__filter-date"
                  value={draft.timeFrom}
                  onChange={(e) => setDraft((prev) => ({ ...prev, timeFrom: e.target.value }))}
                />
                <Input
                  type="datetime-local"
                  className="record-audit-panel__filter-date"
                  value={draft.timeTo}
                  onChange={(e) => setDraft((prev) => ({ ...prev, timeTo: e.target.value }))}
                />
              </>
            )}
            <Button className="record-audit-panel__apply" htmlType="submit" disabled={loading}>
              {displayText(auditChrome.apply)}
            </Button>
          </div>

          {draft.showUserFilter && (
            <div className="record-audit-panel__filter-row">
              <Select
                className="record-audit-panel__filter-kind"
                value="user"
                options={[{ value: "user", label: displayText(auditChrome.filter_user) }]}
              />
              <Input
                className="record-audit-panel__filter-value"
                value={draft.user}
                placeholder={displayText(auditChrome.filter_user)}
                onChange={(e) => setDraft((prev) => ({ ...prev, user: e.target.value }))}
              />
            </div>
          )}

          {draft.showActionFilter && (
            <div className="record-audit-panel__filter-row">
              <Select
                className="record-audit-panel__filter-kind"
                value="event"
                options={[{ value: "event", label: displayText(auditChrome.filter_action) }]}
              />
              <Input
                className="record-audit-panel__filter-value"
                value={draft.action}
                placeholder={displayText(auditChrome.filter_action)}
                onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))}
              />
            </div>
          )}

          {(!draft.showUserFilter || !draft.showActionFilter) && (
            <div className="record-audit-panel__add-filter">
              {!draft.showUserFilter && !draft.showActionFilter ? (
                <Dropdown
                  menu={{
                    items: [
                      { key: "user", label: displayText(auditChrome.filter_user) },
                      { key: "action", label: displayText(auditChrome.filter_action) },
                    ],
                    onClick: ({ key }) => {
                      if (key === "user") {
                        setDraft((prev) => ({ ...prev, showUserFilter: true }));
                      } else if (key === "action") {
                        setDraft((prev) => ({ ...prev, showActionFilter: true }));
                      }
                    },
                  }}
                  trigger={["click"]}
                >
                  <Button type="link" className="record-audit-panel__add-filter-btn">
                    + {displayText(auditChrome.add_filter)}
                  </Button>
                </Dropdown>
              ) : (
                <Button
                  type="link"
                  className="record-audit-panel__add-filter-btn"
                  onClick={() =>
                    setDraft((prev) =>
                      !prev.showUserFilter
                        ? { ...prev, showUserFilter: true }
                        : { ...prev, showActionFilter: true },
                    )
                  }
                >
                  + {displayText(auditChrome.add_filter)}
                </Button>
              )}
            </div>
          )}
        </Form>
      </section>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !panel && (
        <Spin
          description={displayText(auditChrome.loading_records)}
          className="page-loading page__loading"
        />
      )}

      {panel && (
        <>
          <div className="record-audit-panel__summary">
            <p className="record-audit-panel__summary-text">
              {displayTextTemplate(auditChrome.showing_events_for, {
                from: summaryRange.from,
                to: summaryRange.to,
                count: resultCount,
              })}
            </p>
            {panel.actions.export_allowed && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "export",
                      label: (
                        <AuditExportButton
                          vaultId={vaultId}
                          panelKind={panel.panel_kind}
                          objectName={objectName}
                          recordId={recordId}
                          exportAllowed={panel.actions.export_allowed}
                          exportQuery={exportQuery}
                          chrome={auditChrome}
                          menuItem
                        />
                      ),
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button type="text" className="record-audit-panel__actions" aria-label="Actions">
                  ⋯
                </Button>
              </Dropdown>
            )}
          </div>

          <AuditGrid
            columns={panel.columns}
            rows={rows}
            chrome={auditChrome}
            wrapDescription
            veevaHeader
          />

          <div className="pagination-bar">
            {pageToken && (
              <Button onClick={() => void load()}>{displayText(shell.first_page)}</Button>
            )}
            {panel.pagination.next_page_token && (
              <Button
                disabled={loading}
                onClick={() => void load(panel.pagination.next_page_token)}
              >
                {displayText(shell.next_page)}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
