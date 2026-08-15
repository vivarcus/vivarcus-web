import { useMemo } from "react";
import type { MetadataWorkflowStepSummary } from "../../api/types";
import { displayText } from "../../lib/i18n";
import type { ShellChrome } from "../../lib/i18n";

type Shell = ShellChrome;

type LaidOutNode = {
  id: string;
  label: string;
  type: string;
  typeLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type LaidOutEdge = { from: string; to: string; x1: number; y1: number; x2: number; y2: number };

const NODE_W = 200;
const NODE_H = 44;
const H_GAP = 36;
const V_GAP = 56;

/** Localize Veeva flowchart step-type chips (启动工作流 / 任务 / 决策 / 操作 / …). */
export function workflowStepTypeDisplay(
  type: string,
  shell: Shell,
  fallback?: string,
  placeholderError?: boolean,
): string {
  if (placeholderError) {
    return displayText(shell.metadata_workflow_placeholder_error);
  }
  switch (type.toLowerCase()) {
    case "start":
      return displayText(shell.metadata_workflow_step_type_start);
    case "end":
      return displayText(shell.metadata_workflow_step_type_end);
    case "usertask":
    case "contenttask":
      return displayText(shell.metadata_workflow_step_type_task);
    case "decision":
      return displayText(shell.metadata_workflow_step_type_decision);
    case "action":
    case "contentaction":
      return displayText(shell.metadata_workflow_step_type_action);
    case "changestate":
      return displayText(shell.metadata_workflow_step_type_state_change);
    case "notification":
      return displayText(shell.metadata_workflow_step_type_notification);
    case "join":
      return displayText(shell.metadata_workflow_step_type_join);
    case "placeholder":
      return displayText(shell.metadata_workflow_step_type_placeholder);
    default:
      return fallback || type || "—";
  }
}

function layoutFlow(steps: MetadataWorkflowStepSummary[], shell: Shell): {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
} {
  if (steps.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const byId = new Map(steps.map((s) => [s.api_name, s]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  for (const s of steps) {
    incoming.set(s.api_name, incoming.get(s.api_name) ?? 0);
    const next = (s.next_steps ?? []).filter((n) => byId.has(n));
    outgoing.set(s.api_name, next);
    for (const n of next) {
      incoming.set(n, (incoming.get(n) ?? 0) + 1);
    }
  }

  const roots = steps.filter(
    (s) => s.type.toLowerCase() === "start" || (incoming.get(s.api_name) ?? 0) === 0,
  );
  const startIds = roots.length > 0 ? roots.map((s) => s.api_name) : [steps[0].api_name];

  const rank = new Map<string, number>();
  const queue = [...startIds];
  for (const id of startIds) rank.set(id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const r = rank.get(id) ?? 0;
    for (const n of outgoing.get(id) ?? []) {
      const nextRank = r + 1;
      const prev = rank.get(n);
      if (prev === undefined || nextRank > prev) {
        rank.set(n, nextRank);
        queue.push(n);
      }
    }
  }
  // Orphans (unreachable from start) — append after max rank.
  let maxRank = 0;
  for (const r of rank.values()) maxRank = Math.max(maxRank, r);
  for (const s of steps) {
    if (!rank.has(s.api_name)) {
      maxRank += 1;
      rank.set(s.api_name, maxRank);
    }
  }

  const levels = new Map<number, string[]>();
  for (const s of steps) {
    const r = rank.get(s.api_name) ?? 0;
    const list = levels.get(r) ?? [];
    list.push(s.api_name);
    levels.set(r, list);
  }

  // Prefer declaration order within a level.
  const orderIndex = new Map(steps.map((s, i) => [s.api_name, i]));
  for (const [r, ids] of levels) {
    ids.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
    levels.set(r, ids);
  }

  let maxCols = 1;
  for (const ids of levels.values()) maxCols = Math.max(maxCols, ids.length);

  const nodes: LaidOutNode[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  const ranks = [...levels.keys()].sort((a, b) => a - b);
  for (const r of ranks) {
    const ids = levels.get(r) ?? [];
    const rowWidth = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = Math.max(0, (maxCols * NODE_W + (maxCols - 1) * H_GAP - rowWidth) / 2);
    ids.forEach((id, i) => {
      const step = byId.get(id)!;
      const x = startX + i * (NODE_W + H_GAP);
      const y = r * (NODE_H + V_GAP);
      pos.set(id, { x, y });
      const label = displayText(step.label || undefined, step.api_name);
      const typeLabel = workflowStepTypeDisplay(
        step.type,
        shell,
        step.type_label,
        step.placeholder_error,
      );
      nodes.push({
        id,
        label,
        type: step.type.toLowerCase(),
        typeLabel,
        x,
        y,
        w: NODE_W,
        h: NODE_H,
      });
    });
  }

  const edges: LaidOutEdge[] = [];
  for (const s of steps) {
    const from = pos.get(s.api_name);
    if (!from) continue;
    for (const n of outgoing.get(s.api_name) ?? []) {
      const to = pos.get(n);
      if (!to) continue;
      edges.push({
        from: s.api_name,
        to: n,
        x1: from.x + NODE_W / 2,
        y1: from.y + NODE_H,
        x2: to.x + NODE_W / 2,
        y2: to.y,
      });
    }
  }

  const width = maxCols * NODE_W + (maxCols - 1) * H_GAP + 24;
  const height = (ranks.length > 0 ? Math.max(...ranks) + 1 : 1) * (NODE_H + V_GAP) - V_GAP + 24;
  return { nodes, edges, width, height };
}

function edgePath(e: LaidOutEdge): string {
  const midY = e.y1 + (e.y2 - e.y1) / 2;
  if (Math.abs(e.x1 - e.x2) < 2) {
    return `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
  }
  return `M ${e.x1} ${e.y1} L ${e.x1} ${midY} L ${e.x2} ${midY} L ${e.x2} ${e.y2}`;
}

function nodeClass(type: string): string {
  switch (type) {
    case "start":
      return "wf-flowchart__node--start";
    case "end":
      return "wf-flowchart__node--end";
    case "decision":
      return "wf-flowchart__node--decision";
    case "usertask":
    case "contenttask":
      return "wf-flowchart__node--task";
    case "action":
    case "contentaction":
    case "changestate":
      return "wf-flowchart__node--action";
    default:
      return "";
  }
}

/** Veeva-style flowchart for Configuration > Workflow > Workflow Steps. */
export function WorkflowStepFlowchart({
  steps,
  shell,
  onOpenStep,
}: {
  steps: MetadataWorkflowStepSummary[];
  shell: Shell;
  onOpenStep?: (apiName: string) => void;
}) {
  const layout = useMemo(() => layoutFlow(steps, shell), [steps, shell]);

  if (layout.nodes.length === 0) return null;

  return (
    <div
      className="wf-flowchart"
      aria-label={displayText(shell.metadata_workflow_step_flow)}
    >
      <div
        className="wf-flowchart__canvas"
        style={{ width: layout.width, height: layout.height }}
      >
        <svg
          className="wf-flowchart__svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
        >
          <defs>
            <marker
              id="wf-flowchart-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="wf-flowchart__arrow" />
            </marker>
          </defs>
          {layout.edges.map((e) => (
            <path
              key={`${e.from}->${e.to}`}
              d={edgePath(e)}
              className="wf-flowchart__edge"
              markerEnd="url(#wf-flowchart-arrow)"
              fill="none"
            />
          ))}
        </svg>
        {layout.nodes.map((n) => {
          const interactive = typeof onOpenStep === "function";
          const className = `wf-flowchart__node ${nodeClass(n.type)}${
            interactive ? " wf-flowchart__node--link" : ""
          }`;
          if (interactive) {
            return (
              <button
                key={n.id}
                type="button"
                className={className}
                style={{ left: n.x, top: n.y, width: n.w, minHeight: n.h }}
                title={`${n.typeLabel}: ${n.label}`}
                onClick={() => onOpenStep(n.id)}
              >
                <span className="wf-flowchart__type">{n.typeLabel}</span>
                <span className="wf-flowchart__label">{n.label}</span>
              </button>
            );
          }
          return (
            <div
              key={n.id}
              className={className}
              style={{ left: n.x, top: n.y, width: n.w, minHeight: n.h }}
              title={`${n.typeLabel}: ${n.label}`}
            >
              <span className="wf-flowchart__type">{n.typeLabel}</span>
              <span className="wf-flowchart__label">{n.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
