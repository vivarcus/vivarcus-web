import { describe, expect, it } from "vitest";
import type { WorkflowTimelineTask } from "../api/types";
import { timelineTasksForDisplay } from "./workflowTimelineSort";

function task(
  label: string,
  createdAt: string,
  completedAt?: string,
): WorkflowTimelineTask {
  return {
    workflow_task_id: label,
    task_api_name: label,
    task_label: label,
    status: completedAt ? "completed" : "active",
    created_at: createdAt,
    completed_at: completedAt,
    actions: {},
  };
}

describe("timelineTasksForDisplay", () => {
  it("orders tasks newest-first for timeline Details", () => {
    const ordered = timelineTasksForDisplay([
      task("Review Issues", "2026-07-11T02:49:00Z", "2026-07-11T03:00:00Z"),
      task("Medical Review", "2026-07-11T03:01:00Z", "2026-07-11T03:30:00Z"),
      task("CRA Confirm", "2026-07-11T03:31:00Z", "2026-07-11T03:50:00Z"),
    ]);

    expect(ordered.map((t) => t.task_label)).toEqual([
      "CRA Confirm",
      "Medical Review",
      "Review Issues",
    ]);
  });
});
