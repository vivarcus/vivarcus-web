import { describe, expect, it } from "vitest";
import { defaultWorkflowChrome } from "./i18n";
import { formatWorkflowDueDateLabel } from "./workflowDueDate";

describe("formatWorkflowDueDateLabel", () => {
  it("uses workflow chrome for due status labels", () => {
    const workflow = {
      ...defaultWorkflowChrome,
      timeline_due: { text: "到期", key: "system:workflow.timeline_due" },
      due_overdue: { text: "已逾期", key: "system:workflow.due_overdue" },
      due_coming_soon: { text: "即将到期", key: "system:workflow.due_coming_soon" },
      due_on_track: { text: "按期", key: "system:workflow.due_on_track" },
    };

    expect(formatWorkflowDueDateLabel("2026-07-19", "coming_soon", workflow)).toBe(
      "到期: 2026-07-19 (即将到期)",
    );
    expect(formatWorkflowDueDateLabel("2026-07-01", "overdue", workflow)).toBe(
      "到期: 2026-07-01 (已逾期)",
    );
    expect(formatWorkflowDueDateLabel("2026-08-01", "on_track", workflow)).toBe(
      "到期: 2026-08-01 (按期)",
    );
    expect(formatWorkflowDueDateLabel("2026-07-19", "due_soon", workflow)).toBe(
      "到期: 2026-07-19 (即将到期)",
    );
  });

  it("falls back to English without workflow chrome", () => {
    expect(formatWorkflowDueDateLabel("2026-07-19", "coming_soon")).toBe(
      "Due: 2026-07-19 (Due soon)",
    );
  });
});
