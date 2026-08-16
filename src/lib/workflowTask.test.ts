import { describe, expect, it } from "vitest";
import type { TaskDashboardTaskItem, WorkflowTaskAction } from "../api/types";
import { taskCompletionFields, workflowTaskActionFromDashboard } from "./workflowTask";

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

describe("workflowTaskActionFromDashboard", () => {
  it("builds a complete dialog task from Home Tab completion payload without a record page", () => {
    const task: TaskDashboardTaskItem = {
      task_id: "dash-1",
      task_kind: "workflow_task",
      name: "Every Review Task",
      due_status: "none",
      required: true,
      workflow_task_id: "wf-task-1",
      can_complete: true,
      completion: {
        workflow_instance_id: "wf-inst-1",
        workflow_task_id: "wf-task-1",
        workflow_api_name: "tc_wf_every__c",
        workflow_label: "TC WF Every",
        task_label: "Every Review Task",
        status: "active",
        can_complete: true,
        verdict_options: [
          {
            name: "verdict_approve__c",
            label: "Approve",
            comment_label: "Approval Comment",
            comment_required: true,
          },
          { name: "verdict_reject__c", label: "Reject" },
        ],
      },
    };

    expect(workflowTaskActionFromDashboard(task)).toEqual({
      ...task.completion,
      workflow_task_id: "wf-task-1",
      can_complete: true,
    });
  });

  it("returns null when completeWithoutViewing payload is missing", () => {
    const task: TaskDashboardTaskItem = {
      task_id: "dash-1",
      task_kind: "workflow_task",
      name: "Review",
      due_status: "none",
      required: true,
      workflow_task_id: "wf-task-1",
      can_complete: true,
    };
    expect(workflowTaskActionFromDashboard(task)).toBeNull();
  });
});
