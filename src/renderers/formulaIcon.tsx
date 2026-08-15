import type { CSSProperties, ReactNode } from "react";

/** Veeva formula icons render at 16px in list and detail views. */
export const FORMULA_ICON_SIZE_PX = 16;

type FormulaIconProps = {
  name: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

function iconColor(color: string | undefined, fallback = "currentColor"): string {
  return color?.trim() || fallback;
}

function SvgIcon({
  children,
  color,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 16 16"
      width={FORMULA_ICON_SIZE_PX}
      height={FORMULA_ICON_SIZE_PX}
      aria-hidden="true"
      focusable="false"
    >
      <g fill={iconColor(color)} stroke={iconColor(color)}>
        {children}
      </g>
    </svg>
  );
}

function harveyBallFill(name: string): number {
  switch (name) {
    case "harvey-ball-0":
      return 0;
    case "harvey-ball-25":
      return 0.25;
    case "harvey-ball-50":
      return 0.5;
    case "harvey-ball-75":
      return 0.75;
    case "harvey-ball-100":
      return 1;
    default:
      return -1;
  }
}

function harveyBallPath(fill: number): string {
  const cx = 8;
  const cy = 8;
  const r = 6.5;
  if (fill <= 0) {
    return "";
  }
  if (fill >= 1) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + fill * Math.PI * 2;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = fill > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function renderHarveyBall(name: string, color?: string, className?: string, style?: CSSProperties) {
  const fill = harveyBallFill(name);
  if (fill < 0) {
    return null;
  }
  const stroke = iconColor(color);
  const wedge = harveyBallPath(fill);
  return (
    <SvgIcon color={color} className={className} style={style}>
      <circle cx="8" cy="8" r="6.5" fill={fill >= 1 ? stroke : "none"} stroke={stroke} strokeWidth="1.25" />
      {wedge ? <path d={wedge} fill={stroke} stroke="none" /> : null}
    </SvgIcon>
  );
}

function renderCommentBubble(
  name: string,
  color?: string,
  className?: string,
  style?: CSSProperties,
) {
  const stroke = iconColor(color, "#555555");
  const bubble = (
    <>
      <path
        d="M3.25 2.75h9.5a1 1 0 0 1 1 1v5.25a1 1 0 0 1-1 1H7.1L4.6 12.1V9h-1.35a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </>
  );

  switch (name) {
    case "comment-bubble-empty":
      return (
        <SvgIcon color={color} className={className} style={style}>
          {bubble}
        </SvgIcon>
      );
    case "comment-bubble-exclamation":
      return (
        <SvgIcon color={color} className={className} style={style}>
          {bubble}
          <path d="M8 4.6v3.1" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" fill="none" />
          <circle cx="8" cy="9.35" r="0.75" fill={stroke} stroke="none" />
        </SvgIcon>
      );
    case "comment-bubble-checkmark":
      return (
        <SvgIcon color={color} className={className} style={style}>
          {bubble}
          <path
            d="M6.1 6.9 7.35 8.15 9.95 5.55"
            fill="none"
            stroke={stroke}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </SvgIcon>
      );
    default:
      return null;
  }
}

/** Veeva icon names map directly to Font Awesome 4 class suffixes. */
const FONT_AWESOME_ICONS = new Set([
  "adjust",
  "ban",
  "check",
  "circle",
  "circle-o",
  "exclamation-triangle",
  "question",
  "sign-in",
]);

export function FormulaIcon({ name, color, className, style }: FormulaIconProps) {
  const normalized = name.trim();
  const harvey = renderHarveyBall(normalized, color, className, style);
  if (harvey) {
    return harvey;
  }
  const comment = renderCommentBubble(normalized, color, className, style);
  if (comment) {
    return comment;
  }
  if (FONT_AWESOME_ICONS.has(normalized)) {
    return (
      <i
        className={`fa fa-${normalized} field-icon__fa${className ? ` ${className}` : ""}`}
        style={{ color: iconColor(color), ...style }}
        aria-hidden="true"
      />
    );
  }
  return (
    <i
      className={`fa fa-circle field-icon__fa${className ? ` ${className}` : ""}`}
      style={{ color: iconColor(color), ...style }}
      aria-hidden="true"
    />
  );
}
