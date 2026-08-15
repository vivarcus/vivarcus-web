import { Link } from "react-router-dom";
import type { DisplayContext, HoverCardModel } from "../api/types";
import { recordDetailHref } from "../lib/fields";
import { formatDateDisplayValue } from "../lib/i18n/dateFormat";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { defaultCompletenessHoverChrome } from "../lib/i18n/chromeTypes";
import { useUi } from "../context/UiContext";
import { FormulaIcon } from "../renderers/formulaIcon";

type IconModel = {
  name: string;
  color?: string;
  title?: string;
};

function formatHoverDate(value: string | undefined, displayContext?: DisplayContext): string {
  if (!value?.trim()) {
    return "—";
  }
  const formatted = formatDateDisplayValue(value, displayContext);
  return formatted || value;
}

function headerPercent(card: HoverCardModel): string | null {
  const raw = card.percent_complete?.trim();
  if (!raw) {
    return null;
  }
  if (card.percent_value != null && Number.isFinite(card.percent_value)) {
    if (card.percent_value === Math.trunc(card.percent_value)) {
      return String(Math.trunc(card.percent_value));
    }
    return String(card.percent_value);
  }
  const stripped = raw.replace(/%$/, "").trim();
  return stripped || null;
}

type Props = {
  card: HoverCardModel;
  icon?: IconModel;
  vaultId?: string;
  tabApiName?: string;
  displayContext?: DisplayContext;
};

export function CompletenessHoverCard({ card, icon, vaultId, tabApiName, displayContext }: Props) {
  const { shell } = useUi();
  const chrome = { ...defaultCompletenessHoverChrome, ...shell.completeness_hover };
  const dependencies = card.dependencies ?? [];
  const documents = card.documents ?? [];
  const totals = card.document_totals ?? { expected: 0, actual: 0, approved: 0 };
  const tasks = card.task_stats ?? {
    total: 0,
    required: 0,
    complete: 0,
    complete_required: 0,
  };
  const milestoneHref =
    vaultId && card.milestone_record_id
      ? recordDetailHref(vaultId, "milestone__v", card.milestone_record_id, tabApiName)
      : undefined;
  const percentLabel = headerPercent(card);

  return (
    <div className="milestone-completeness-hovercard">
      <div className="milestone-completeness-hovercard__header">
        {milestoneHref ? (
          <Link to={milestoneHref} className="milestone-completeness-hovercard__milestone-link">
            {card.milestone_name}
          </Link>
        ) : (
          <span className="milestone-completeness-hovercard__milestone-name">
            {card.milestone_name}
          </span>
        )}
        {percentLabel ? (
          <span className="milestone-completeness-hovercard__header-percent">{percentLabel}</span>
        ) : null}
        {icon?.name ? (
          <span className="milestone-completeness-hovercard__header-icon field-icon" aria-hidden>
            <FormulaIcon name={icon.name} color={icon.color} />
          </span>
        ) : null}
      </div>

      <section className="milestone-completeness-hovercard__section">
        <h4 className="milestone-completeness-hovercard__section-title">
          {displayTextTemplate(chrome.dependencies_count, { count: dependencies.length })}
        </h4>
        <table className="milestone-completeness-hovercard__data-table">
          <thead>
            <tr>
              <th scope="col">{displayText(chrome.milestone)}</th>
              <th scope="col">{displayText(chrome.planned_finish_date)}</th>
              <th scope="col">{displayText(chrome.actual_finish_date)}</th>
            </tr>
          </thead>
          <tbody>
            {dependencies.length === 0 ? (
              <tr className="milestone-completeness-hovercard__empty-row">
                <td colSpan={3} />
              </tr>
            ) : (
              dependencies.map((dep) => (
                <tr key={dep.record_id ?? dep.name}>
                  <td>
                    {vaultId && dep.record_id ? (
                      <Link
                        to={recordDetailHref(vaultId, "milestone__v", dep.record_id, tabApiName)}
                        className="milestone-completeness-hovercard__row-link"
                      >
                        {dep.name}
                      </Link>
                    ) : (
                      dep.name
                    )}
                  </td>
                  <td>{formatHoverDate(dep.planned_finish_date, displayContext)}</td>
                  <td>{formatHoverDate(dep.actual_finish_date, displayContext)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="milestone-completeness-hovercard__section">
        <h4 className="milestone-completeness-hovercard__section-title">
          {displayText(chrome.expected_documents)}
        </h4>
        <div className="milestone-completeness-hovercard__stat-line">
          <span>{displayTextTemplate(chrome.expected, { count: totals.expected ?? 0 })}</span>
          <span>{displayTextTemplate(chrome.actual, { count: totals.actual ?? 0 })}</span>
          <span>{displayTextTemplate(chrome.approved, { count: totals.approved ?? 0 })}</span>
        </div>
        {milestoneHref ? (
          <div className="milestone-completeness-hovercard__footer-link">
            <Link to={milestoneHref}>{displayText(chrome.view_all_expected_documents)}</Link>
          </div>
        ) : null}
      </section>

      <section className="milestone-completeness-hovercard__section">
        <h4 className="milestone-completeness-hovercard__section-title">
          {displayTextTemplate(chrome.documents_count, { count: documents.length })}
        </h4>
        <table className="milestone-completeness-hovercard__data-table">
          <thead>
            <tr>
              <th scope="col">{displayText(chrome.name_version)}</th>
              <th scope="col">{displayText(chrome.status)}</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr className="milestone-completeness-hovercard__empty-row">
                <td colSpan={2} />
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.record_id ?? doc.name}>
                  <td>
                    {doc.version ? `${doc.name} (${doc.version})` : doc.name}
                  </td>
                  <td>{doc.status || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="milestone-completeness-hovercard__section milestone-completeness-hovercard__section--last">
        <h4 className="milestone-completeness-hovercard__section-title">
          {displayText(chrome.clinical_user_tasks)}
        </h4>
        <div className="milestone-completeness-hovercard__task-grid">
          <span>{displayTextTemplate(chrome.total, { count: tasks.total ?? 0 })}</span>
          <span>{displayTextTemplate(chrome.complete, { count: tasks.complete ?? 0 })}</span>
          <span>{displayTextTemplate(chrome.required, { count: tasks.required ?? 0 })}</span>
          <span>
            {displayTextTemplate(chrome.complete_required, { count: tasks.complete_required ?? 0 })}
          </span>
        </div>
        {milestoneHref ? (
          <div className="milestone-completeness-hovercard__footer-link">
            <Link to={milestoneHref}>{displayText(chrome.view_all_tasks)}</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
