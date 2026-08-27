import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskCompleteModal } from "./TaskCompleteModal";
import type { WorkflowTaskAction } from "../api/types";
import { UiProvider } from "../context/UiContext";

function renderModal(
  task: WorkflowTaskAction,
  onSubmit = vi.fn().mockResolvedValue(undefined),
) {
  return render(
    <UiProvider>
      <TaskCompleteModal task={task} onClose={vi.fn()} onSubmit={onSubmit} />
    </UiProvider>,
  );
}

function craConfirmTask(): WorkflowTaskAction {
  return {
    workflow_instance_id: "wf-1",
    workflow_task_id: "task-1",
    workflow_label: "PD Review",
    task_label: "CRA Confirm",
    task_instructions:
      "PM has finished the review task, please check the comment and take action accordingly.",
    status: "active",
    can_complete: true,
    verdict_options: [
      {
        name: "verdict_confirm__c",
        label: "Confirm",
        comment_label: "Comment",
        comment_required: false,
      },
    ],
  };
}

describe("TaskCompleteModal", () => {
  it("shows instructions and verdict before comment for CRA Confirm", async () => {
    const user = userEvent.setup();
    renderModal(craConfirmTask());

    expect(
      screen.getByText(
        /PM has finished the review task, please check the comment and take action accordingly\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Confirm" })).not.toBeChecked();
    expect(screen.queryByText("Comment")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Confirm" }));
    expect(screen.getByText("Comment")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("requires selecting the verdict before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderModal(craConfirmTask(), onSubmit);

    await user.click(screen.getByRole("button", { name: /^Complete Task$/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Verdict is required")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Confirm" }));
    await user.click(screen.getByRole("button", { name: /^Complete Task$/i }));
    expect(onSubmit).toHaveBeenCalledWith("Confirm", "", {});
  });

  it("collects a verdict per envelope item for Multiple Verdicts", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const task: WorkflowTaskAction = {
      workflow_instance_id: "wf-1",
      workflow_task_id: "task-1",
      workflow_api_name: "batch_review__c",
      workflow_label: "Batch Review",
      task_label: "Review Items",
      status: "active",
      can_complete: true,
      multiple_verdicts: true,
      contents: [
        { record_id: "rec-1", ordinal: 0, name: "Study A" },
        { record_id: "rec-2", ordinal: 1, name: "Study B" },
      ],
      verdict_options: [
        { name: "verdict_approve__c", label: "Approve" },
        { name: "verdict_reject__c", label: "Reject" },
      ],
    };
    renderModal(task, onSubmit);

    expect(screen.getByText("Study A")).toBeInTheDocument();
    expect(screen.getByText("Study B")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Complete Task$/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    const radios = screen.getAllByRole("radio", { name: "Approve" });
    await user.click(radios[0]);
    await user.click(screen.getAllByRole("radio", { name: "Reject" })[1]);
    await user.click(screen.getByRole("button", { name: /^Complete Task$/i }));
    expect(onSubmit).toHaveBeenCalledWith("Approve", "", {}, [
      { record_id: "rec-1", verdict_label: "Approve" },
      { record_id: "rec-2", verdict_label: "Reject" },
    ]);
  });

  it("shows verdict reason after selecting a verdict", async () => {
    const user = userEvent.setup();
    const task: WorkflowTaskAction = {
      workflow_instance_id: "wf-1",
      workflow_task_id: "task-1",
      workflow_api_name: "quality_issue_task__v",
      workflow_label: "Quality Issue Task",
      task_label: "Resolve Quality Issue",
      status: "active",
      can_complete: true,
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
    renderModal(task);

    expect(screen.queryByText("Verdict Reason")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Resolved" }));
    expect(screen.getByText("Verdict Reason")).toBeInTheDocument();
  });

  it("does not prompt for signature on a verdict without the eSignature flag", async () => {
    const user = userEvent.setup();
    const task: WorkflowTaskAction = {
      workflow_instance_id: "wf-1",
      workflow_task_id: "task-1",
      workflow_label: "Review",
      task_label: "Review Task",
      status: "active",
      can_complete: true,
      signature_required: true,
      verdict_options: [
        {
          name: "verdict_approve__c",
          label: "Approve",
          signature_required: true,
        },
        { name: "verdict_reject__c", label: "Reject" },
      ],
    };
    renderModal(task);

    await user.click(screen.getByRole("radio", { name: "Reject" }));
    expect(screen.getByRole("button", { name: /^Complete Task$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /signature/i })).not.toBeInTheDocument();
  });
});
