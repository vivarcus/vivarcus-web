import { PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Pagination, Progress, Select, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { TMFHomeModel, TMFHomeQualityTypeCount } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import "../styles/pages/tmf-home-page.css";

const TMF_HOME_PAGE = "tmf_homepage__v";

export { TMF_HOME_PAGE };

const QUALITY_TYPE_COLORS: Record<string, string> = {
  duplicate__v: "#fadb14",
  inaccurate_content__v: "#722ed1",
  misclassified_misfiled__v: "#d48806",
  signature_not_present__v: "#d4b106",
  expired__v: "#13c2c2",
  incomplete_metadata__v: "#52c41a",
  missing__v: "#eb2f96",
  unknown__v: "#8c8c8c",
};

const QUALITY_TYPE_FALLBACK_COLORS = [
  "#cf1322",
  "#1677ff",
  "#fa8c16",
  "#2f54eb",
  "#a0d911",
  "#c41d7f",
];

function qualityTypeColor(typeName: string, index: number) {
  return QUALITY_TYPE_COLORS[typeName] ?? QUALITY_TYPE_FALLBACK_COLORS[index % QUALITY_TYPE_FALLBACK_COLORS.length];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

function formatPercent(value: number) {
  if (value >= 100) return "100%";
  if (value <= 0) return "0.0%";
  return `${Math.round(value * 10) / 10}%`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function QualityIssuesPie({
  byType,
  ariaLabel,
}: {
  byType: TMFHomeQualityTypeCount[];
  ariaLabel: string;
}) {
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const total = byType.reduce((sum, entry) => sum + entry.count, 0);
  const slices = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    return byType
      .filter((entry) => entry.count > 0)
      .map((entry, index) => {
        const sweep = (entry.count / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        return {
          key: entry.type_name,
          path: describeSlice(cx, cy, r, start, end === 360 ? 359.99 : end),
          color: qualityTypeColor(entry.type_name, index),
        };
      });
  }, [byType, total, cx, cy, r]);

  return (
    <svg
      className="tmf-quality__chart"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel}
    >
      {slices.length === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="#f5f5f5" stroke="var(--border)" strokeWidth={1} />
      ) : (
        slices.map((slice) => <path key={slice.key} d={slice.path} fill={slice.color} />)
      )}
    </svg>
  );
}

type TmfHomeStoredScope = {
  studyId?: string;
  studyCountryId?: string;
  siteId?: string;
};

function readTmfHomeStoredScope(storageKey: string | null): TmfHomeStoredScope {
  if (!storageKey) return {};
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as TmfHomeStoredScope;
  } catch {
    return {};
  }
}

export function TMFHomePage() {
  const vaultId = useVaultId();
  const storageKey = vaultId ? `tmf-home:${vaultId}` : null;
  const [model, setModel] = useState<TMFHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Hydrate scope synchronously so the first /ui/tmf-home call uses sessionStorage
  // instead of racing an empty studyId that later overwrites the stored selection.
  const [studyId, setStudyId] = useState<string | undefined>(
    () => readTmfHomeStoredScope(storageKey).studyId,
  );
  const [studyCountryId, setStudyCountryId] = useState<string | undefined>(
    () => readTmfHomeStoredScope(storageKey).studyCountryId,
  );
  const [siteId, setSiteId] = useState<string | undefined>(
    () => readTmfHomeStoredScope(storageKey).siteId,
  );
  const [milestoneCategory, setMilestoneCategory] = useState<string | undefined>();
  const [milestonesPage, setMilestonesPage] = useState(1);
  const [attentionCategory, setAttentionCategory] = useState<string | undefined>();
  const [qualityFilter, setQualityFilter] = useState("open");
  const [qualityAssignee, setQualityAssignee] = useState("all");
  const [milestoneFilterId, setMilestoneFilterId] = useState<string | undefined>();

  useEffect(() => {
    const stored = readTmfHomeStoredScope(storageKey);
    setStudyId(stored.studyId);
    setStudyCountryId(stored.studyCountryId);
    setSiteId(stored.siteId);
  }, [storageKey]);

  const persistScope = useCallback(
    (next: TmfHomeStoredScope) => {
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
      const next = await api.tmfHome(vaultId, {
        studyId,
        studyCountryId,
        siteId,
        milestoneCategory,
        milestoneFilterId,
        milestonesPage,
        milestonesPageSize: 5,
        myTasksPageSize: 10,
        attentionCategory,
        qualityFilter,
        qualityAssignee,
      });
      setModel(next);
      // Only adopt server default when the client has no explicit study selection.
      if (!studyId && next.scope?.study_id) {
        setStudyId(next.scope.study_id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load TMF Home",
      );
    } finally {
      setLoading(false);
    }
  }, [
    vaultId,
    studyId,
    studyCountryId,
    siteId,
    milestoneCategory,
    milestoneFilterId,
    milestonesPage,
    attentionCategory,
    qualityFilter,
    qualityAssignee,
  ]);

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
      (model?.widgets.upcoming_milestones.milestone_categories ?? []).map((cat) => ({
        value: cat,
        label: cat.replace(/__v$/, "").replace(/_/g, " "),
      })),
    [model?.widgets.upcoming_milestones.milestone_categories],
  );

  if (!vaultId) {
    return null;
  }

  const scope = model?.scope;
  const chrome = model?.chrome;
  const widgets = model?.widgets;
  const milestones = widgets?.upcoming_milestones;
  const attention = widgets?.tasks_requiring_attention;
  const completeness = widgets?.completeness;
  const timeliness = widgets?.timeliness;

  return (
    <div className="page tmf-home-page">
      <header className="tmf-home-page__context">
        <div className="tmf-home-page__context-main">
          <h1>
            {displayText(chrome?.study_homepage_title, "Study Homepage")}
            {scope?.study_name ? `: ${scope.study_name}` : ""}
          </h1>
          {scope?.study_lifecycle_label && <Tag color="processing">{scope.study_lifecycle_label}</Tag>}
        </div>
        <nav
          className="tmf-home-page__breadcrumb"
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
              setMilestoneFilterId(undefined);
              persistScope({ studyId: value });
            }}
            style={{ minWidth: 220 }}
          />
          <span className="tmf-home-page__breadcrumb-sep">›</span>
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
          <span className="tmf-home-page__breadcrumb-sep">›</span>
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
        <div className="tmf-home-page__loading">
          <Spin size="large" />
        </div>
      ) : model && widgets && chrome ? (
        <div className="tmf-home-page__grid">
          <section className="tmf-widget">
            <header className="tmf-widget__header">
              <h2>{displayText(chrome.upcoming_milestones)}</h2>
              <div className="tmf-widget__header-actions">
                {milestones?.create_href && (
                  <Link to={milestones.create_href} className="tmf-widget__action">
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
                    style={{ minWidth: 160 }}
                  />
                )}
              </div>
            </header>
            {(milestones?.items ?? []).length === 0 ? (
              <p className="tmf-widget__empty">{displayText(chrome.no_upcoming_milestones)}</p>
            ) : (
              <>
                <table className="tmf-table tmf-table--milestones">
                  <thead>
                    <tr>
                      <th>{displayText(chrome.column_milestone)}</th>
                      <th>{displayText(chrome.column_completeness)}</th>
                      <th>{displayText(chrome.column_planned_finish_date)}</th>
                      <th>{displayText(chrome.column_baseline_finish_date)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(milestones?.items ?? []).map((item) => (
                      <tr
                        key={item.record_id}
                        className={
                          milestoneFilterId === item.record_id ? "tmf-table__row--selected" : undefined
                        }
                        onClick={() =>
                          setMilestoneFilterId((prev) =>
                            prev === item.record_id ? undefined : item.record_id,
                          )
                        }
                      >
                        <td>
                          <Link to={item.record_detail_href}>{item.name}</Link>
                        </td>
                        <td>
                          <span
                            className="tmf-harvey"
                            title={item.completeness_label ?? undefined}
                            style={
                              item.completeness_color
                                ? { borderColor: item.completeness_color, color: item.completeness_color }
                                : undefined
                            }
                          />
                        </td>
                        <td>{formatDate(item.planned_finish_date)}</td>
                        <td>{formatDate(item.baseline_finish_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <footer className="tmf-widget__footer">
                  <Pagination
                    size="small"
                    current={milestones?.page ?? 1}
                    pageSize={milestones?.page_size ?? 5}
                    total={milestones?.total_count ?? 0}
                    onChange={(page) => setMilestonesPage(page)}
                    showSizeChanger={false}
                  />
                  {milestones?.view_all_href && (
                    <Link to={milestones.view_all_href} className="tmf-widget__link">
                      {displayText(chrome.view_all)} <RightOutlined />
                    </Link>
                  )}
                </footer>
              </>
            )}
          </section>

          <section className="tmf-widget">
            <header className="tmf-widget__header">
              <h2>{displayText(chrome.completeness)}</h2>
            </header>
            <div className="tmf-completeness">
              <div className="tmf-completeness__unapproved">
                {completeness?.unapproved_documents_href ? (
                  <Link to={completeness.unapproved_documents_href} className="tmf-completeness__count-link">
                    <span className="tmf-completeness__count">{completeness.unapproved_count}</span>
                    <span className="tmf-completeness__count-label">
                      {displayText(chrome.unapproved_documents)}
                    </span>
                  </Link>
                ) : (
                  <>
                    <span className="tmf-completeness__count">{completeness?.unapproved_count ?? 0}</span>
                    <span className="tmf-completeness__count-label">
                      {displayText(chrome.unapproved_documents)}
                    </span>
                  </>
                )}
              </div>
              <Progress
                type="dashboard"
                percent={Math.round(completeness?.percent_complete ?? 0)}
                format={(pct) => (
                  <span className="tmf-completeness__pct">
                    {pct}%
                    <small>{displayText(chrome.complete)}</small>
                  </span>
                )}
              />
            </div>
            <div className="tmf-completeness__links">
              {completeness?.review_overcount_href && (
                <Link to={completeness.review_overcount_href}>
                  {displayText(chrome.review_overcount)}
                </Link>
              )}
              {completeness?.review_pending_href && (
                <Link to={completeness.review_pending_href}>
                  {displayTextTemplate(chrome.review_pending_decisions, {
                    count: completeness.pending_decision_count,
                  })}
                </Link>
              )}
            </div>
          </section>

          <section className="tmf-widget tmf-widget--wide">
            <header className="tmf-widget__header">
              <h2>{displayText(chrome.timeliness)}</h2>
            </header>
            <div className="tmf-timeliness">
              <div className="tmf-timeliness__chart">
                <Progress
                  type="dashboard"
                  percent={Math.round(timeliness?.timely_percent ?? 0)}
                  success={{ percent: 0 }}
                  strokeColor="#52c41a"
                  trailColor="#ff4d4f"
                  format={() => null}
                />
                <div className="tmf-timeliness__overlay">
                  <span>{formatPercent(timeliness?.timely_percent ?? 0)}</span>
                  <span>{formatPercent(timeliness?.late_percent ?? 0)}</span>
                </div>
              </div>
              <ul className="tmf-timeliness__legend">
                <li>
                  <span className="tmf-dot tmf-dot--timely" />
                  {displayTextTemplate(chrome.approved_within_days, {
                    days: timeliness?.threshold_days ?? 30,
                  })}
                </li>
                <li>
                  <span className="tmf-dot tmf-dot--late" />
                  {displayTextTemplate(chrome.approved_after_days, {
                    days: timeliness?.threshold_days ?? 30,
                  })}
                </li>
              </ul>
            </div>
          </section>

          <section className="tmf-widget">
            <header className="tmf-widget__header">
              <h2>{displayText(chrome.tasks_requiring_attention)}</h2>
            </header>
            <div className="tmf-attention">
              <button
                type="button"
                className={`tmf-attention__bucket${attentionCategory === "overdue" ? " is-active" : ""}`}
                onClick={() =>
                  setAttentionCategory((prev) => (prev === "overdue" ? undefined : "overdue"))
                }
              >
                <span className="tmf-attention__value tmf-attention__value--overdue">
                  {attention?.overdue_count ?? 0}
                </span>
                <span className="tmf-attention__label">{displayText(chrome.overdue)}</span>
              </button>
              <button
                type="button"
                className={`tmf-attention__bucket${attentionCategory === "unassigned" ? " is-active" : ""}`}
                onClick={() =>
                  setAttentionCategory((prev) => (prev === "unassigned" ? undefined : "unassigned"))
                }
              >
                <span className="tmf-attention__value tmf-attention__value--unassigned">
                  {attention?.unassigned_count ?? 0}
                </span>
                <span className="tmf-attention__label">{displayText(chrome.unassigned)}</span>
              </button>
              <button
                type="button"
                className={`tmf-attention__bucket${attentionCategory === "due_today" ? " is-active" : ""}`}
                onClick={() =>
                  setAttentionCategory((prev) => (prev === "due_today" ? undefined : "due_today"))
                }
              >
                <span className="tmf-attention__value tmf-attention__value--due-today">
                  {attention?.due_today_count ?? 0}
                </span>
                <span className="tmf-attention__label">{displayText(chrome.due_today)}</span>
              </button>
            </div>
            {attentionCategory && (attention?.items?.length ?? 0) > 0 && (
              <ul className="tmf-task-list">
                {(attention?.items ?? []).map((task) => (
                  <li key={task.task_id}>
                    {task.record_detail_href ? (
                      <Link to={task.record_detail_href} className="tmf-task-list__link">
                        <span>{task.name}</span>
                        <span className="tmf-task-list__due">{formatDate(task.due_date)}</span>
                      </Link>
                    ) : (
                      <span className="tmf-task-list__row">
                        <span>{task.name}</span>
                        <span className="tmf-task-list__due">{formatDate(task.due_date)}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tmf-widget">
            <header className="tmf-widget__header">
              <h2>{displayText(chrome.my_tasks)}</h2>
            </header>
            {(widgets.my_tasks.tasks ?? []).length === 0 ? (
              <p className="tmf-widget__empty">{displayText(chrome.no_items_found)}</p>
            ) : (
              <table className="tmf-table">
                <thead>
                  <tr>
                    <th>{displayText(chrome.column_task_name)}</th>
                    <th>{displayText(chrome.column_task_due_date)}</th>
                  </tr>
                </thead>
                <tbody>
                  {(widgets.my_tasks.tasks ?? []).map((task) => (
                    <tr key={task.task_id}>
                      <td>
                        {task.record_detail_href ? (
                          <Link to={task.record_detail_href}>{task.name}</Link>
                        ) : (
                          task.name
                        )}
                      </td>
                      <td>{formatDate(task.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <footer className="tmf-widget__footer">
              <span />
              {widgets.my_tasks.view_all_href && (
                <Link to={widgets.my_tasks.view_all_href} className="tmf-widget__link">
                  {displayText(chrome.view_all)} <RightOutlined />
                </Link>
              )}
            </footer>
          </section>

          {widgets.quality_issues.visible && (
            <section className="tmf-widget tmf-widget--wide">
              <header className="tmf-widget__header">
                <h2>{displayText(chrome.quality_issues)}</h2>
                <div className="tmf-widget__header-actions">
                  <Select
                    value={qualityFilter}
                    options={[
                      { value: "open", label: displayText(chrome.filter_open) },
                      { value: "closed", label: displayText(chrome.filter_closed) },
                      { value: "all", label: displayText(chrome.filter_all) },
                    ]}
                    onChange={setQualityFilter}
                    style={{ minWidth: 120 }}
                  />
                  <Select
                    value={qualityAssignee}
                    options={[
                      { value: "all", label: displayText(chrome.filter_all) },
                      { value: "assigned_to_me", label: displayText(chrome.filter_assigned_to_me) },
                    ]}
                    onChange={setQualityAssignee}
                    style={{ minWidth: 140 }}
                  />
                  {widgets.quality_issues.create_action?.allowed &&
                    widgets.quality_issues.create_action.href && (
                      <Link to={widgets.quality_issues.create_action.href} className="tmf-widget__action">
                        <PlusOutlined />{" "}
                        {widgets.quality_issues.create_action.label ?? displayText(chrome.create)}
                      </Link>
                    )}
                </div>
              </header>
              <div className="tmf-quality">
                <QualityIssuesPie
                  byType={widgets.quality_issues.by_type ?? []}
                  ariaLabel={displayText(chrome.quality_issues)}
                />
                <ul className="tmf-quality__legend">
                  {(widgets.quality_issues.by_type ?? []).map((entry, index) => (
                    <li key={entry.type_name}>
                      <span
                        className="tmf-dot"
                        style={{ background: qualityTypeColor(entry.type_name, index) }}
                      />
                      <span className="tmf-quality__legend-label">{entry.type_label}</span>
                      {entry.count > 0 ? (
                        <strong className="tmf-quality__legend-count">{entry.count}</strong>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {(model.navigation ?? []).length > 0 && (
            <nav
              className="tmf-home-page__nav"
              aria-label={displayText(chrome.related_pages_aria)}
            >
              {(model.navigation ?? []).map((link) => (
                <Link key={link.href} to={link.href} className="tmf-home-page__nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      ) : null}
    </div>
  );
}
