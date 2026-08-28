import { Alert, Button, Form, Input, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import { AuditExportButton } from "../components/AuditExportButton";
import { AuditGrid } from "../components/AuditGrid";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useAuth } from "../auth/AuthProvider";
import { useUi } from "../context/UiContext";
import { useAuditPanelLoader } from "../hooks/useAuditPanelLoader";
import { auditPanelLabel, auditPanelRows, parseAuditPanelKind, type AuditPanelKind } from "../lib/auditPanel";
import {
  buildExportQuery,
  domainDateRangeTooLarge,
  localDateInputToRFC3339,
  localDateTimeInputToRFC3339,
} from "../lib/auditExport";
import { displayText } from "../lib/i18n";

function resolvePanel(routePanel: string | undefined, queryPanel: string | null): AuditPanelKind {
  return parseAuditPanelKind(routePanel) ?? parseAuditPanelKind(queryPanel) ?? "system";
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultLastDayRange(): { timeFrom: string; timeTo: string } {
  // datetime-local is minute-precision. Advance "to" by one minute so a login
  // that lands in the current minute (or a slightly slow browser clock) is included.
  const to = new Date(Date.now() + 60_000);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { timeFrom: toLocalInputValue(from), timeTo: toLocalInputValue(to) };
}

function quickHistoryRange(kind: string): { timeFrom: string; timeTo: string } {
  const to = new Date();
  const from = new Date(to);
  if (kind === "1d") {
    from.setDate(from.getDate() - 1);
  } else if (kind === "7d") {
    from.setDate(from.getDate() - 7);
  } else if (kind === "14d") {
    from.setDate(from.getDate() - 14);
  } else {
    return { timeFrom: "", timeTo: "" };
  }
  return { timeFrom: toLocalDateValue(from), timeTo: toLocalDateValue(to) };
}

type FilterDraft = {
  timeFrom: string;
  timeTo: string;
  quickHistory: string;
  user: string;
  action: string;
  loginType: string;
  status: string;
  vaultIdFilter: string;
  object: string;
};

function buildDefaultDraft(panel: AuditPanelKind, objectFromUrl: string): FilterDraft {
  const range = panel === "domain" ? { timeFrom: "", timeTo: "" } : defaultLastDayRange();
  return {
    ...range,
    quickHistory: "",
    user: "",
    action: "",
    loginType: "",
    status: "",
    vaultIdFilter: "",
    object: objectFromUrl,
  };
}

const LOGIN_TYPE_OPTIONS = [
  { value: "User Login", label: "User Login" },
  { value: "User Logout", label: "User Logout" },
  { value: "Change Password", label: "Change Password" },
  { value: "Password Changed", label: "Password Changed" },
];

const LOGIN_STATUS_OPTIONS = [
  { value: "Success", label: "Success" },
  { value: "Password Change Required", label: "Password Change Required" },
];

export function AdminLogsPage() {
  const vaultId = useVaultId();
  const { selectedVault } = useAuth();
  const { displayContext, shell } = useUi();
  const { panel: routePanel } = useParams<{ panel?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const panel = resolvePanel(routePanel, searchParams.get("panel"));
  const objectFromUrl = searchParams.get("object") ?? "";

  const [draft, setDraft] = useState<FilterDraft>(() => buildDefaultDraft(panel, objectFromUrl));
  const [applied, setApplied] = useState<FilterDraft>(() => buildDefaultDraft(panel, objectFromUrl));
  const [domainHistoryRequested, setDomainHistoryRequested] = useState(false);
  const [domainFilterError, setDomainFilterError] = useState<string | null>(null);

  useEffect(() => {
    const next = buildDefaultDraft(panel, objectFromUrl);
    setDraft(next);
    setApplied(next);
    setDomainHistoryRequested(false);
    setDomainFilterError(null);
  }, [panel, objectFromUrl]);

  const resolveTimeParams = useCallback(
    (filters: FilterDraft) => {
      if (panel === "domain") {
        return {
          time_from: localDateInputToRFC3339(filters.timeFrom, false),
          time_to: localDateInputToRFC3339(filters.timeTo, true),
        };
      }
      return {
        time_from: localDateTimeInputToRFC3339(filters.timeFrom),
        time_to: localDateTimeInputToRFC3339(filters.timeTo, true),
      };
    },
    [panel],
  );

  const fetchPanel = useCallback(
    async (pageToken?: string) => {
      if (!vaultId) {
        throw new Error("Missing vault");
      }
      const times = resolveTimeParams(applied);
      return api.vaultAuditPanel(vaultId, {
        panel,
        object: panel === "object_records" ? applied.object || undefined : undefined,
        user: applied.user || undefined,
        action: panel === "login" ? undefined : applied.action || undefined,
        type: panel === "login" ? applied.loginType || undefined : undefined,
        status: panel === "login" ? applied.status || undefined : undefined,
        vault_id_filter: panel === "login" ? applied.vaultIdFilter || undefined : undefined,
        time_from: times.time_from,
        time_to: times.time_to,
        page_token: pageToken,
        page_size: 50,
        timezone: displayContext.timezone,
        date_format_profile: displayContext.date_format_profile,
        locale: displayContext.locale,
      });
    },
    [vaultId, panel, applied, displayContext, resolveTimeParams],
  );

  const panelEnabled = panel !== "domain" || domainHistoryRequested;

  const { panel: model, error, loading, load, auditChrome } = useAuditPanelLoader({
    enabled: Boolean(vaultId) && panelEnabled,
    fetchPanel,
    retryWhenEmpty: panel === "login" ? (loaded) => auditPanelRows(loaded).length === 0 : undefined,
  });

  // Prefill Vault ID filter display with numeric ID (backend already defaults empty filter to current vault).
  useEffect(() => {
    if (panel !== "login" || !model?.numeric_vault_id) return;
    setDraft((prev) => {
      if (prev.vaultIdFilter) return prev;
      return { ...prev, vaultIdFilter: model.numeric_vault_id ?? "" };
    });
    setApplied((prev) => {
      if (prev.vaultIdFilter) return prev;
      return { ...prev, vaultIdFilter: model.numeric_vault_id ?? "" };
    });
  }, [panel, model?.numeric_vault_id]);

  const rows = model ? auditPanelRows(model) : [];

  const exportQuery = useMemo(() => {
    const times = resolveTimeParams(applied);
    return buildExportQuery(panel, {
      objectName: panel === "object_records" ? applied.object || undefined : undefined,
      domainId: selectedVault?.domain_id ?? model?.domain_id,
      user: applied.user || undefined,
      action: panel === "login" ? undefined : applied.action || undefined,
      loginType: panel === "login" ? applied.loginType || undefined : undefined,
      status: panel === "login" ? applied.status || undefined : undefined,
      vaultIdFilter: panel === "login" ? applied.vaultIdFilter || undefined : undefined,
      time_from: times.time_from,
      time_to: times.time_to,
      displayContext,
    });
  }, [panel, applied, selectedVault?.domain_id, model?.domain_id, displayContext, resolveTimeParams]);

  if (!vaultId) {
    return null;
  }

  function applyFilters() {
    setApplied({ ...draft });
    if (panel === "object_records") {
      const params = new URLSearchParams(searchParams);
      if (draft.object.trim()) {
        params.set("object", draft.object.trim());
      } else {
        params.delete("object");
      }
      setSearchParams(params);
    }
  }

  function applyDomainHistory() {
    if (!draft.timeFrom.trim() || !draft.timeTo.trim()) {
      setDomainFilterError(displayText(auditChrome.domain_range_required));
      return;
    }
    if (domainDateRangeTooLarge(draft.timeFrom, draft.timeTo)) {
      setDomainFilterError(displayText(auditChrome.domain_range_too_large));
      return;
    }
    setDomainFilterError(null);
    setApplied({ ...draft });
    setDomainHistoryRequested(true);
  }

  const showStandardFilters = panel === "object_records" || panel === "system" || panel === "login";
  const showDomainFilters = panel === "domain";
  const showResults = model && (showStandardFilters || (showDomainFilters && domainHistoryRequested));

  return (
    <AdminPageShell
      title={auditPanelLabel(panel, auditChrome)}
      actions={
        model?.actions.export_allowed && showResults ? (
          <div className="page-header__actions">
            <AuditExportButton
              vaultId={vaultId}
              panelKind={panel}
              domainId={selectedVault?.domain_id ?? model.domain_id}
              objectName={panel === "object_records" ? applied.object || undefined : undefined}
              exportAllowed={model.actions.export_allowed}
              exportQuery={exportQuery}
              chrome={auditChrome}
            />
          </div>
        ) : undefined
      }
    >

      {showDomainFilters && (
        <Form className="filter-bar" layout="inline" requiredMark={false} onFinish={applyDomainHistory}>
          <Form.Item label={displayText(auditChrome.quick_history)}>
            <Select
              className="filter-bar__min-160"
              value={draft.quickHistory || undefined}
              placeholder={displayText(auditChrome.quick_history_placeholder)}
              allowClear
              options={[
                { value: "1d", label: displayText(auditChrome.quick_history_last_day) },
                { value: "7d", label: displayText(auditChrome.quick_history_last_7_days) },
                { value: "14d", label: displayText(auditChrome.quick_history_last_2_weeks) },
              ]}
              onChange={(value) => {
                const kind = value ?? "";
                const range = quickHistoryRange(kind);
                setDraft((prev) => ({ ...prev, quickHistory: kind, ...range }));
                setDomainFilterError(null);
              }}
            />
          </Form.Item>
          <Form.Item label={displayText(auditChrome.date_range)}>
            <Input
              type="date"
              value={draft.timeFrom}
              onChange={(e) => {
                setDraft((prev) => ({
                  ...prev,
                  quickHistory: "",
                  timeFrom: e.target.value,
                }));
                setDomainFilterError(null);
              }}
            />
          </Form.Item>
          <Form.Item label={displayText(auditChrome.date_range_to)}>
            <Input
              type="date"
              value={draft.timeTo}
              onChange={(e) => {
                setDraft((prev) => ({
                  ...prev,
                  quickHistory: "",
                  timeTo: e.target.value,
                }));
                setDomainFilterError(null);
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" disabled={loading}>
              {displayText(auditChrome.get_history)}
            </Button>
          </Form.Item>
        </Form>
      )}

      {showStandardFilters && (
        <Form className="filter-bar" layout="inline" requiredMark={false} onFinish={applyFilters}>
          <Form.Item label={displayText(auditChrome.filter_timestamp)}>
            <Input
              type="datetime-local"
              value={draft.timeFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, timeFrom: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label={displayText(auditChrome.date_range_to)}>
            <Input
              type="datetime-local"
              value={draft.timeTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, timeTo: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label={displayText(auditChrome.filter_user)}>
            <Input
              value={draft.user}
              placeholder={displayText(auditChrome.filter_user)}
              onChange={(e) => setDraft((prev) => ({ ...prev, user: e.target.value }))}
            />
          </Form.Item>
          {panel !== "login" && (
            <Form.Item label={displayText(auditChrome.filter_action)}>
              <Input
                value={draft.action}
                placeholder={displayText(auditChrome.filter_action)}
                onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))}
              />
            </Form.Item>
          )}
          {panel === "login" && (
            <>
              <Form.Item label={displayText(auditChrome.filter_type)}>
                <Select
                  allowClear
                  className="filter-bar__min-160"
                  value={draft.loginType || undefined}
                  options={LOGIN_TYPE_OPTIONS}
                  placeholder={displayText(auditChrome.filter_type)}
                  onChange={(value) => setDraft((prev) => ({ ...prev, loginType: value ?? "" }))}
                />
              </Form.Item>
              <Form.Item label={displayText(auditChrome.filter_status)}>
                <Select
                  allowClear
                  className="filter-bar__min-160"
                  value={draft.status || undefined}
                  options={LOGIN_STATUS_OPTIONS}
                  placeholder={displayText(auditChrome.filter_status)}
                  onChange={(value) => setDraft((prev) => ({ ...prev, status: value ?? "" }))}
                />
              </Form.Item>
              <Form.Item label={displayText(auditChrome.filter_vault_id)}>
                <Input
                  value={draft.vaultIdFilter}
                  placeholder={displayText(auditChrome.filter_vault_id)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, vaultIdFilter: e.target.value }))}
                />
              </Form.Item>
            </>
          )}
          {panel === "object_records" && (
            <Form.Item label={displayText(auditChrome.filter_object)}>
              <Input
                value={draft.object}
                placeholder="Study Site or site__v"
                onChange={(e) => setDraft((prev) => ({ ...prev, object: e.target.value }))}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button htmlType="submit" disabled={loading}>
              {displayText(auditChrome.apply)}
            </Button>
          </Form.Item>
        </Form>
      )}

      {(error || domainFilterError) && (
        <Alert type="error" title={domainFilterError || error} showIcon role="alert" />
      )}
      {loading && !model && panelEnabled && (
        <Spin description={displayText(auditChrome.loading_logs)} className="page-loading page__loading" />
      )}

      {showResults && (
        <>
          <AuditGrid
            columns={model.columns}
            rows={rows}
            chrome={auditChrome}
            wrapDescription
            emptyText={
              showDomainFilters ? displayText(auditChrome.empty_domain_records) : undefined
            }
          />
          <div className="pagination-bar">
            {model.pagination.next_page_token && (
              <Button
                disabled={loading}
                onClick={() => void load(model.pagination.next_page_token)}
              >
                {displayText(shell.next_page, "Next page")}
              </Button>
            )}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
