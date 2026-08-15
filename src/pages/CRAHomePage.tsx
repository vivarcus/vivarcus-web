import { DownloadOutlined, PlusOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Progress, Select, Spin, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CRAHomeModel } from "../api/types";
import { EnrollmentStatusChart } from "../components/study-mgmt/EnrollmentStatusChart";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";
import type { ClinicalHomeChrome } from "../lib/i18n/chromeTypes";
import "../styles/pages/cra-home-page.css";

export const CRA_HOME_PAGE = "site_monitoring_dashboard__ctms";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm:ss A") : value;
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

function metricPercent(item: CRAHomeModel["widgets"]["summary_metrics"]["items"][number]) {
  if (item.percent != null) return Math.round(item.percent);
  return 0;
}

function QualityBars({
  bars,
  average,
  chrome,
}: {
  bars: CRAHomeModel["widgets"]["quality"]["issues_chart"]["bars"];
  average?: number;
  chrome: ClinicalHomeChrome;
}) {
  const max = Math.max(1, ...bars.map((b) => b.total), average ?? 0);
  if (bars.length === 0) {
    return <p className="cra-widget__empty">{displayText(chrome.empty_no_items)}</p>;
  }
  return (
    <ul className="cra-quality-bars">
      {bars.map((bar) => (
        <li key={bar.key}>
          <div className="cra-quality-bars__label">
            <span>{bar.label}</span>
            <strong>{bar.total}</strong>
          </div>
          <div className="cra-quality-bars__track">
            {bar.segments.map((seg) => (
              <Tooltip key={seg.key} title={`${seg.label}: ${seg.count}`}>
                <span
                  className={`cra-quality-bars__seg cra-quality-bars__seg--${seg.key.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{ width: `${(seg.count / max) * 100}%` }}
                />
              </Tooltip>
            ))}
          </div>
        </li>
      ))}
      {average != null && (
        <li className="cra-quality-bars__average">
          {displayText(chrome.average)}: {average.toFixed(1)}
        </li>
      )}
    </ul>
  );
}

export function CRAHomePage() {
  const vaultId = useVaultId();
  const storageKey = vaultId ? `cra-home:${vaultId}` : null;
  const [model, setModel] = useState<CRAHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | undefined>();
  const [studyCountryId, setStudyCountryId] = useState<string | undefined>();
  const [siteId, setSiteId] = useState<string | undefined>();
  const [issueStatus, setIssueStatus] = useState<string | undefined>();
  const [openItemStatus, setOpenItemStatus] = useState<string | undefined>();

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { studyId?: string; studyCountryId?: string; siteId?: string };
      setStudyId(parsed.studyId);
      setStudyCountryId(parsed.studyCountryId);
      setSiteId(parsed.siteId);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persistScope = useCallback(
    (next: { studyId?: string; studyCountryId?: string; siteId?: string }) => {
      if (!storageKey) return;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.craHome(vaultId, {
        studyId,
        studyCountryId,
        siteId,
        issueStatus,
        openItemStatus,
        myTasksPageSize: 10,
        monitoringPageSize: 10,
      });
      setModel(next);
      if (!studyId && next.scope?.study_id) {
        setStudyId(next.scope.study_id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : displayText(undefined, "Failed to load CRA Homepage"),
      );
    } finally {
      setLoading(false);
    }
  }, [vaultId, studyId, studyCountryId, siteId, issueStatus, openItemStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const studyOptions = useMemo(
    () => (model?.studies ?? []).map((s) => ({ value: s.record_id, label: s.name })),
    [model?.studies],
  );
  const countryOptions = useMemo(
    () => (model?.study_countries ?? []).map((s) => ({ value: s.record_id, label: s.name })),
    [model?.study_countries],
  );
  const siteOptions = useMemo(
    () => (model?.study_sites ?? []).map((s) => ({ value: s.record_id, label: s.name })),
    [model?.study_sites],
  );

  if (!vaultId) {
    return null;
  }

  const scope = model?.scope;
  const widgets = model?.widgets;
  const chrome = model?.chrome;

  return (
    <div className="page cra-home-page">
      <header className="cra-home-page__context">
        <div className="cra-home-page__context-main">
          <h1>{scope?.page_title ?? displayText(chrome?.study_homepage_title, "Study Homepage")}</h1>
          {scope?.study_lifecycle_label && <Tag color="processing">{scope.study_lifecycle_label}</Tag>}
        </div>
        <nav className="cra-home-page__breadcrumb" aria-label={displayText(chrome?.study_scope_aria, "Study scope")}>
          <Select
            value={studyId}
            options={studyOptions}
            placeholder={displayText(chrome?.select_study, "Select Study")}
            loading={loading && !model}
            onChange={(value) => {
              setStudyId(value);
              setStudyCountryId(undefined);
              setSiteId(undefined);
              persistScope({ studyId: value });
            }}
            style={{ minWidth: 220 }}
          />
          <span className="cra-home-page__breadcrumb-sep">›</span>
          <Select
            allowClear
            value={studyCountryId}
            options={countryOptions}
            placeholder={displayText(chrome?.select_study_country, "Select Study Country")}
            disabled={!studyId}
            onChange={(value) => {
              setStudyCountryId(value);
              setSiteId(undefined);
              persistScope({ studyId, studyCountryId: value });
            }}
            style={{ minWidth: 200 }}
          />
          <span className="cra-home-page__breadcrumb-sep">›</span>
          <Select
            allowClear
            value={siteId}
            options={siteOptions}
            placeholder={displayText(chrome?.select_site, "Select Site")}
            disabled={!studyId}
            onChange={(value) => {
              setSiteId(value);
              persistScope({ studyId, studyCountryId, siteId: value });
            }}
            style={{ minWidth: 180 }}
          />
        </nav>
      </header>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model ? (
        <div className="cra-home-page__loading">
          <Spin size="large" />
        </div>
      ) : model && widgets && chrome ? (
        <div className="cra-home-page__grid">
          <section className="cra-widget">
            <header className="cra-widget__header">
              <h2>{widgets.details.title}</h2>
              {widgets.details.create_communication_log_href && (
                <Link to={widgets.details.create_communication_log_href} className="cra-widget__action">
                  <PlusOutlined /> {displayText(chrome.create_communication_log)}
                </Link>
              )}
            </header>
            {widgets.details.fields.length === 0 ? (
              <p className="cra-widget__empty">{displayText(chrome.no_details_available)}</p>
            ) : (
              <dl className="cra-details">
                {widgets.details.fields.map((field) => (
                  <div key={field.label} className="cra-details__row">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="cra-widget">
            <header className="cra-widget__header">
              <h2>{displayText(chrome.summary_metrics)}</h2>
            </header>
            <div className="cra-summary-metrics">
              {widgets.summary_metrics.items.map((item) => (
                <div key={item.key} className="cra-summary-metrics__item">
                  <p className="cra-summary-metrics__label">{item.label}</p>
                  {item.kind === "enrollment_rate" ? (
                    <Tooltip
                      title={
                        item.actual != null || item.planned != null || item.forecast != null
                          ? `${displayText(chrome.metric_actual)}: ${item.actual ?? "—"} · ${displayText(chrome.metric_planned)}: ${item.planned ?? "—"} · ${displayText(chrome.metric_forecast)}: ${item.forecast ?? "—"}`
                          : undefined
                      }
                    >
                      <p className="cra-summary-metrics__value">
                        {item.display_value ?? displayText(chrome.enrollment_rate_default)}
                      </p>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={`${displayText(chrome.metric_actual)}: ${item.actual ?? "—"} · ${displayText(chrome.metric_planned)}: ${item.planned ?? "—"} · ${displayText(chrome.metric_forecast)}: ${item.forecast ?? "—"}`}
                    >
                      <Progress type="dashboard" percent={metricPercent(item)} size={100} />
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
            {widgets.summary_metrics.last_updated && (
              <p className="cra-widget__footer">
                {displayText(chrome.last_updated)} {formatDate(widgets.summary_metrics.last_updated)}
              </p>
            )}
          </section>

          <section className="cra-widget">
            <header className="cra-widget__header">
              <h2>{displayText(chrome.monitoring_plan)}</h2>
              <div className="cra-widget__actions">
                {widgets.monitoring_plan.create_href && (
                  <Link to={widgets.monitoring_plan.create_href} className="cra-widget__action">
                    <PlusOutlined /> {displayText(chrome.create)}
                  </Link>
                )}
              </div>
            </header>
            <Table
              size="small"
              pagination={false}
              rowKey="record_id"
              columns={[
                {
                  title: displayText(chrome.column_name),
                  dataIndex: "name",
                  render: (value, row) => <Link to={row.record_detail_href}>{value}</Link>,
                },
                {
                  title: displayText(chrome.column_study_site),
                  dataIndex: "study_site_name",
                  render: (v?: string) => v || "—",
                },
                {
                  title: displayText(chrome.column_planned_visit_start_date),
                  dataIndex: "planned_visit_start_date",
                  render: formatShortDate,
                },
                {
                  title: displayText(chrome.column_lifecycle_state),
                  dataIndex: "lifecycle_state_label",
                  render: (v?: string) => v || "—",
                },
              ]}
              dataSource={widgets.monitoring_plan.items}
              locale={{ emptyText: displayText(chrome.empty_no_items) }}
            />
            {widgets.monitoring_plan.view_all_href && (
              <footer className="cra-widget__footer-row">
                <Link to={widgets.monitoring_plan.view_all_href} className="cra-widget__link">
                  {displayText(chrome.view_all)} <RightOutlined />
                </Link>
              </footer>
            )}
          </section>

          <section className="cra-widget">
            <header className="cra-widget__header">
              <h2>{displayText(chrome.my_tasks)}</h2>
              {widgets.my_tasks.view_all_href && (
                <Link to={widgets.my_tasks.view_all_href} className="cra-widget__link">
                  {displayText(chrome.view_all)} <RightOutlined />
                </Link>
              )}
            </header>
            {widgets.my_tasks.tasks.length === 0 ? (
              <p className="cra-widget__empty">{displayText(chrome.empty_no_items)}</p>
            ) : (
              <Table
                size="small"
                pagination={false}
                rowKey="task_id"
                columns={[
                  {
                    title: displayText(chrome.column_task_name),
                    dataIndex: "name",
                    render: (_value, row) =>
                      row.record_detail_href ? <Link to={row.record_detail_href}>{row.name}</Link> : row.name,
                  },
                  {
                    title: displayText(chrome.column_task_due_date),
                    dataIndex: "due_date",
                    width: 140,
                    render: (value: string | undefined) => formatShortDate(value),
                  },
                ]}
                dataSource={widgets.my_tasks.tasks}
              />
            )}
          </section>

          <section className="cra-widget cra-widget--wide">
            <header className="cra-widget__header">
              <h2>
                {widgets.enrollment_status.missing_data?.length ? <WarningOutlined /> : null}{" "}
                {widgets.enrollment_status.title}
              </h2>
              {widgets.enrollment_status.export_allowed && (
                <Button type="text" icon={<DownloadOutlined />} disabled>
                  {displayText(chrome.export)}
                </Button>
              )}
            </header>
            {widgets.enrollment_status.missing_data && widgets.enrollment_status.missing_data.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                title={`${displayText(chrome.missing_data_warning)}: ${widgets.enrollment_status.missing_data.join(", ")}`}
              />
            ) : null}
            {widgets.enrollment_status.series.length === 0 ? (
              <p className="cra-widget__empty">
                {widgets.enrollment_status.legend.join(" · ") || displayText(chrome.no_enrollment_data)}
              </p>
            ) : (
              <>
                <EnrollmentStatusChart series={widgets.enrollment_status.series} chrome={chrome} />
                <ul className="cra-enrollment-legend">
                  {widgets.enrollment_status.legend.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </>
            )}
            {widgets.enrollment_status.last_updated && (
              <p className="cra-widget__footer">
                {displayText(chrome.last_updated)} {formatDate(widgets.enrollment_status.last_updated)}
              </p>
            )}
          </section>

          <section className="cra-widget cra-widget--wide">
            <header className="cra-widget__header">
              <h2>{widgets.quality.title}</h2>
              <div className="cra-widget__actions">
                {widgets.quality.create_issue_href && (
                  <Link to={widgets.quality.create_issue_href} className="cra-widget__action">
                    <PlusOutlined /> {displayText(chrome.create_issue)}
                  </Link>
                )}
                {widgets.quality.create_task_href && (
                  <Link to={widgets.quality.create_task_href} className="cra-widget__action">
                    <PlusOutlined /> {displayText(chrome.create_task)}
                  </Link>
                )}
              </div>
            </header>
            <div className="cra-quality-grid">
              <div>
                <div className="cra-quality-chart__header">
                  <h3>{widgets.quality.issues_chart.title}</h3>
                  <Select
                    value={
                      issueStatus ??
                      widgets.quality.issues_chart.status_filter ??
                      widgets.quality.issues_chart.status_options?.[0]
                    }
                    options={(widgets.quality.issues_chart.status_options ?? []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    onChange={setIssueStatus}
                    style={{ minWidth: 140 }}
                  />
                </div>
                <QualityBars
                  bars={widgets.quality.issues_chart.bars}
                  average={widgets.quality.issues_chart.average_count}
                  chrome={chrome}
                />
                {widgets.quality.issues_chart.legend && widgets.quality.issues_chart.legend.length > 0 && (
                  <ul className="cra-enrollment-legend">
                    {widgets.quality.issues_chart.legend.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="cra-quality-chart__header">
                  <h3>{widgets.quality.open_items_chart.title}</h3>
                  <Select
                    value={
                      openItemStatus ??
                      widgets.quality.open_items_chart.status_filter ??
                      widgets.quality.open_items_chart.status_options?.[0]
                    }
                    options={(widgets.quality.open_items_chart.status_options ?? []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    onChange={setOpenItemStatus}
                    style={{ minWidth: 140 }}
                  />
                </div>
                <QualityBars bars={widgets.quality.open_items_chart.bars} chrome={chrome} />
                {widgets.quality.open_items_chart.legend && widgets.quality.open_items_chart.legend.length > 0 && (
                  <ul className="cra-enrollment-legend">
                    {widgets.quality.open_items_chart.legend.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
