import type { StudyMgmtHomeModel } from "../../api/types";
import { displayText } from "../../lib/i18n";
import type { ClinicalHomeChrome } from "../../lib/i18n/chromeTypes";

type Series = StudyMgmtHomeModel["widgets"]["enrollment_status"]["series"][number];

const COLORS = ["#1677ff", "#52c41a", "#faad14", "#eb2f96", "#722ed1"];

function allPoints(series: Series[]) {
  return series.flatMap((line) => line.points);
}

type Props = {
  series: Series[];
  chrome?: Partial<Pick<ClinicalHomeChrome, "enrollment_chart_aria" | "number_of_subjects">>;
};

export function EnrollmentStatusChart({ series, chrome }: Props) {
  const points = allPoints(series);
  if (points.length === 0) {
    return null;
  }

  const width = 720;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const dates = [...new Set(points.map((p) => p.date))].sort();
  const maxY = Math.max(1, ...points.map((p) => p.value));

  const xForDate = (date: string) => {
    if (dates.length === 1) return pad.left + innerW / 2;
    const idx = dates.indexOf(date);
    return pad.left + (idx / (dates.length - 1)) * innerW;
  };
  const yForValue = (value: number) => pad.top + innerH - (value / maxY) * innerH;

  return (
    <svg
      className="smh-enrollment-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={displayText(chrome?.enrollment_chart_aria, "Enrollment status chart")}
    >
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="var(--border)" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="var(--border)" />
      <text x={8} y={pad.top + innerH / 2} className="smh-enrollment-chart__axis-label" transform={`rotate(-90 8 ${pad.top + innerH / 2})`}>
        {displayText(chrome?.number_of_subjects, "Number of Subjects")}
      </text>
      {series.map((line, lineIndex) => {
        if (line.points.length === 0) return null;
        const path = line.points
          .map((point, index) => {
            const cmd = index === 0 ? "M" : "L";
            return `${cmd}${xForDate(point.date)},${yForValue(point.value)}`;
          })
          .join(" ");
        return (
          <g key={line.status}>
            <path d={path} fill="none" stroke={COLORS[lineIndex % COLORS.length]} strokeWidth={2} />
            {line.points.map((point) => (
              <circle
                key={`${line.status}-${point.date}`}
                cx={xForDate(point.date)}
                cy={yForValue(point.value)}
                r={3}
                fill={COLORS[lineIndex % COLORS.length]}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
