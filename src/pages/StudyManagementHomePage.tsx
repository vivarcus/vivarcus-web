import { DownloadOutlined, PlusOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Pagination, Progress, Select, Spin, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { StudyMgmtHomeModel } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { EnrollmentStatusChart } from "../components/study-mgmt/EnrollmentStatusChart";
import { displayText } from "../lib/i18n";
import "../styles/pages/study-management-home-page.css";

export const STUDY_MGMT_HOME_PAGE = "study_management_dashboard__ctms";

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

function metricPercent(item: StudyMgmtHomeModel["widgets"]["summary_metrics"]["items"][number]) {
  if (item.percent != null) return Math.round(item.percent);
  return 0;
}

export function StudyManagementHomePage() {
  const vaultId = useVaultId();
  const storageKey = vaultId ? `study-mgmt-home:${vaultId}` : null;
  const [model, setModel] = useState<StudyMgmtHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | undefined>();
  const [studyCountryId, setStudyCountryId] = useState<string | undefined>();
  const [siteId, setSiteId] = useState<string | undefined>();
  const [milestoneCategory, setMilestoneCategory] = useState<string | undefined>();
  const [milestonesPage, setMilestonesPage] = useState(1);

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
      const next = await api.studyMgmtHome(vaultId, {
        studyId,
        studyCountryId,
        siteId,
        milestoneCategory,
        milestonesPage,
        milestonesPageSize: 10,
        myTasksPageSize: 10,
      });
      setModel(next);
      if (!studyId && next.scope?.study_id) {
        setStudyId(next.scope.study_id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Study Management Homepage",
      );
    } finally {
      setLoading(false);
    }
  }, [vaultId, studyId, studyCountryId, siteId, milestoneCategory, milestonesPage]);

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
  const categoryOptions = useMemo(
    () =>
      (model?.widgets.milestones.milestone_categories ?? []).map((cat) => ({
        value: cat,
        label: cat.replace(/__v$/, "").replace(/_/g, " "),
      })),
    [model?.widgets.milestones.milestone_categories],
  );

  if (!vaultId) {
    return null;
  }

  const scope = model?.scope;
  const widgets = model?.widgets;
  const chrome = model?.chrome;

  return (
    <div className="page study-mgmt-home-page">
      <header className="study-mgmt-home-page__context">
        <div className="study-mgmt-home-page__context-main">
          <h1>{scope?.study_name ?? displayText(chrome?.study_mgmt_homepage_title, "Study Management Homepage")}</h1>
          {scope?.study_lifecycle_label && <Tag color="processing">{scope.study_lifecycle_label}</Tag>}
        </div>
        <nav
          className="study-mgmt-home-page__breadcrumb"
          aria-label={displayText(chrome?.study_scope_aria, "Study scope")}
        >
          <Select
            value={studyId}
            options={studyOptions}
            placeholder={displayText(chrome?.select_study, "Select Study")}
            loading={loading && !model}
            onChange={(value) => {
              setStudyId(value);
              setStudyCountryId(undefined);
              setSiteId(undefined);
              setMilestonesPage(1);
              persistScope({ studyId: value });
            }}
            style={{ minWidth: 220 }}
          />
          <span className="study-mgmt-home-page__breadcrumb-sep">›</span>
          <Select
            allowClear
            value={studyCountryId}
            options={countryOptions}
            placeholder={displayText(chrome?.select_study_country, "Select Study Country")}
            disabled={!studyId}
            onChange={(value) => {
              setStudyCountryId(value);
              setSiteId(undefined);
              setMilestonesPage(1);
              persistScope({ studyId, studyCountryId: value });
            }}
            style={{ minWidth: 200 }}
          />
          <span className="study-mgmt-home-page__breadcrumb-sep">›</span>
          <Select
            allowClear
            value={siteId}
            options={siteOptions}
            placeholder={displayText(chrome?.select_site, "Select Site")}
            disabled={!studyId}
            onChange={(value) => {
              setSiteId(value);
              setMilestonesPage(1);
              persistScope({ studyId, studyCountryId, siteId: value });
            }}
            style={{ minWidth: 180 }}
          />
        </nav>
      </header>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model ? (
        <div className="study-mgmt-home-page__loading">
          <Spin size="large" />
        </div>
      ) : model && widgets && chrome ? (
        <div className="study-mgmt-home-page__grid">
          <section className="smh-widget">
            <header className="smh-widget__header">
              <h2>{displayText(chrome.summary_metrics)}</h2>
            </header>
            <div className="smh-summary-metrics">
              {widgets.summary_metrics.items.map((item) => (
                <div key={item.key} className="smh-summary-metrics__item">
                  <p className="smh-summary-metrics__label">{item.label}</p>
                  {item.kind === "site_status" ? (
                    <p className="smh-summary-metrics__value">{item.display_value ?? "—"}</p>
                  ) : (
                    <Progress type="dashboard" percent={metricPercent(item)} size={100} />
                  )}
                </div>
              ))}
            </div>
            {widgets.summary_metrics.last_updated && (
              <p className="smh-widget__footer">
                {displayText(chrome.last_updated)} {formatDate(widgets.summary_metrics.last_updated)}
              </p>
            )}
          </section>

          <section className="smh-widget">
            <header className="smh-widget__header">
              <h2>{displayText(chrome.monitoring_compliance)}</h2>
            </header>
            <div className="smh-compliance">
              <div>
                <p className="smh-compliance__label">{displayText(chrome.visits_overdue)}</p>
                <p className="smh-compliance__overdue">
                  {widgets.monitoring_compliance.visits_overdue}/{widgets.monitoring_compliance.visits_expected}
                </p>
              </div>
              <div>
                <p className="smh-compliance__label">{widgets.monitoring_compliance.cycle_time_label}</p>
                <p className="smh-compliance__cycle">{widgets.monitoring_compliance.cycle_time_display}</p>
                {widgets.monitoring_compliance.compliance_percent != null && (
                  <Progress
                    type="circle"
                    percent={Math.round(widgets.monitoring_compliance.compliance_percent)}
                    size={72}
                  />
                )}
              </div>
            </div>
          </section>

          <section className="smh-widget">
            <header className="smh-widget__header">
              <h2>{displayText(chrome.my_tasks)}</h2>
              {widgets.my_tasks.view_all_href && (
                <Link to={widgets.my_tasks.view_all_href} className="smh-widget__link">
                  {displayText(chrome.view_all)} <RightOutlined />
                </Link>
              )}
            </header>
            {widgets.my_tasks.tasks.length === 0 ? (
              <p className="smh-widget__empty">{displayText(chrome.empty_no_items)}</p>
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
                      row.record_detail_href ? (
                        <Link to={row.record_detail_href}>{row.name}</Link>
                      ) : (
                        row.name
                      ),
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

          <section className="smh-widget">
            <header className="smh-widget__header">
              <h2>{displayText(chrome.monitoring_status)}</h2>
            </header>
            {widgets.monitoring_status.bars.length === 0 ? (
              <p className="smh-widget__empty">
                {widgets.monitoring_status.empty_label ?? displayText(chrome.empty_no_items)}
              </p>
            ) : (
              <ul className="smh-monitoring-status">
                {widgets.monitoring_status.bars.map((bar) => (
                  <li key={bar.event_type}>
                    <div className="smh-monitoring-status__title">
                      <span>{bar.event_label}</span>
                      <strong>{bar.total}</strong>
                    </div>
                    <div className="smh-monitoring-status__segments">
                      {bar.states.map((seg) => (
                        <span key={seg.state} title={`${seg.state_label}: ${seg.count}`}>
                          {seg.state_label} ({seg.count})
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="smh-widget smh-widget--wide">
            <header className="smh-widget__header">
              <h2>{widgets.milestones.title}</h2>
              <div className="smh-widget__actions">
                {widgets.milestones.create_href && (
                  <Link to={widgets.milestones.create_href} className="smh-widget__action">
                    <PlusOutlined /> {displayText(chrome.create)}
                  </Link>
                )}
                {categoryOptions.length > 0 && (
                  <Select
                    allowClear
                    placeholder={displayText(chrome.milestone_category)}
                    value={milestoneCategory}
                    options={categoryOptions}
                    onChange={(value) => {
                      setMilestoneCategory(value);
                      setMilestonesPage(1);
                    }}
                    style={{ minWidth: 180 }}
                  />
                )}
              </div>
            </header>
            <Table
              size="small"
              pagination={false}
              rowKey="record_id"
              columns={[
                {
                  title: displayText(chrome.column_milestone),
                  dataIndex: "name",
                  render: (value, row) => <Link to={row.record_detail_href}>{value}</Link>,
                },
                {
                  title: displayText(chrome.column_baseline_finish_date),
                  dataIndex: "baseline_finish_date",
                  render: formatShortDate,
                },
                {
                  title: displayText(chrome.column_planned_finish_date),
                  dataIndex: "planned_finish_date",
                  render: formatShortDate,
                },
                {
                  title: displayText(chrome.column_actual_finish_date),
                  dataIndex: "actual_finish_date",
                  render: formatShortDate,
                },
                {
                  title: displayText(chrome.column_completeness),
                  dataIndex: "completeness_label",
                  render: (value, row) =>
                    value ? (
                      <span style={row.completeness_color ? { color: row.completeness_color } : undefined}>
                        {value}
                      </span>
                    ) : (
                      "○"
                    ),
                },
                { title: displayText(chrome.column_sequence), dataIndex: "sequence", width: 90 },
                { title: displayText(chrome.column_lifecycle_state), dataIndex: "lifecycle_state_label" },
              ]}
              dataSource={widgets.milestones.items}
              locale={{ emptyText: displayText(chrome.empty_no_items) }}
            />
            <footer className="smh-widget__footer-row">
              <Pagination
                size="small"
                current={widgets.milestones.page}
                pageSize={widgets.milestones.page_size}
                total={widgets.milestones.total_count}
                showSizeChanger={false}
                onChange={(page) => setMilestonesPage(page)}
              />
              {widgets.milestones.view_all_href && (
                <Link to={widgets.milestones.view_all_href} className="smh-widget__link">
                  {displayText(chrome.view_all)} <RightOutlined />
                </Link>
              )}
            </footer>
          </section>

          {widgets.enrollment_status.visible && (
            <section className="smh-widget smh-widget--wide">
              <header className="smh-widget__header">
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
                <p className="smh-widget__empty">
                  {widgets.enrollment_status.legend.join(" · ") || displayText(chrome.no_enrollment_data)}
                </p>
              ) : (
                <>
                  <EnrollmentStatusChart series={widgets.enrollment_status.series} chrome={chrome} />
                  <ul className="smh-enrollment-legend">
                    {widgets.enrollment_status.legend.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </>
              )}
              {widgets.enrollment_status.last_updated && (
                <p className="smh-widget__footer">
                  {displayText(chrome.last_updated)} {formatDate(widgets.enrollment_status.last_updated)}
                </p>
              )}
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
