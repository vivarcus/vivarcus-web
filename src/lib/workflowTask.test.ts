import { describe, expect, it } from "vitest";
import type { WorkflowTaskAction } from "../api/types";
import { taskCompletionFields } from "./workflowTask";

describe("taskCompletionFields", () => {
  it("includes verdict-embedded field after selecting a verdict", () => {
    const task: WorkflowTaskAction = {
      workflow_instance_id: "wf-1",
      workflow_api_name: "quality_issue_task__v",
      workflow_label: "Quality Issue Task",
      status: "active",
      verdict_options: [
        {
          name: "verdict_resolved__c",
          label: "Resolved",
          field_api_name: "verdict_reason__v",
          field_label: "Verdict Reason",
          field_required: true,
        },
      ],
    };

    expect(taskCompletionFields(task, "")).toEqual([]);
    expect(taskCompletionFields(task, "Resolved")).toEqual([
      {
        field_api_name: "verdict_reason__v",
        field_label: "Verdict Reason",
        required: true,
      },
    ]);
  });
});
