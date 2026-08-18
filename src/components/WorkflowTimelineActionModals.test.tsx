import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, HttpError } from "../api/client";
import type {
  RecordPageModel,
  WorkflowTimelineInstance,
  WorkflowTimelineTask,
} from "../api/types";
import { UiProvider } from "../context/UiContext";
import { defaultPageActionLabels, defaultPageMessages } from "../lib/i18n";
import { WorkflowTimelineActionModals } from "./WorkflowTimelineActionModals";

vi.mock("../api/client", () => {
  class HttpError extends Error {
    status: number;
    body: { error: string } | null;
    constructor(status: number, message: string, body: { error: string } | null = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  }
  return {
    api: {
      workflowReassignTask: vi.fn(),
    },
    HttpError,
  };
});

vi.mock("./WorkflowUserSelect", () => ({
  WorkflowUserSelect: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onChange("user-accept")}>
      {value ? `selected:${value}` : "pick-user"}
    </button>
  ),
}));

function makePage(): RecordPageModel {
  return {
    model_type: "record_page",
    vault_id: "v1",
    display_context: "view",
    object_api_name: "study__v",
    object_label: { text: "Study" },
    record_id: "r1",
    record_version: 1,
    selected_layout: { api_name: "default__v", label: { text: "Default" } },
    layout_options: [],
    sections: [],
    actions: {
      edit_allowed: true,
      delete_allowed: false,
      labels: defaultPageActionLabels,
    },
    messages: defaultPageMessages,
    workflow: {},
    audit: { visible: false },
    sharing: { visible: false },
    schema_fingerprint: "fp",
    ui_fingerprint: "fp",
  } as unknown as RecordPageModel;
}

function makeInstance(): WorkflowTimelineInstance {
  return {
    workflow_instance_id: "wf-1",
    workflow_api_name: "gov__c",
    workflow_label: "Gov",
    status: "active",
    owner: { user_id: "user-accept" },
    initiator: { user_id: "user-accept" },
    started_at: "2026-01-01T00:00:00Z",
    active_task_count: 1,
    completed_task_count: 0,
    total_task_count: 2,
    tasks: [],
    actions: {},
  };
}

function makeTask(): WorkflowTimelineTask {
  return {
    workflow_task_id: "task-1",
    task_api_name: "review_task_1__c",
    task_label: "Review Task 1",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    actions: { can_reassign: true },
  };
}

describe("WorkflowTimelineActionModals reassign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the dialog open and shows assignee unchanged in the modal", async () => {
    const user = userEvent.setup();
    vi.mocked(api.workflowReassignTask).mockRejectedValue(
      new HttpError(400, "assignee unchanged", { error: "assignee unchanged" }),
    );
    const onClose = vi.fn();
    const onError = vi.fn();
    const onReloadPage = vi.fn().mockResolvedValue(undefined);

    render(
      <UiProvider>
        <WorkflowTimelineActionModals
          state={{ kind: "reassign-task", instance: makeInstance(), task: makeTask() }}
          onClose={onClose}
          vaultId="v1"
          objectName="study__v"
          recordId="r1"
          page={makePage()}
          onPageUpdate={vi.fn()}
          onError={onError}
          onReloadPage={onReloadPage}
        />
      </UiProvider>,
    );

    await user.click(screen.getByRole("button", { name: "pick-user" }));
    await user.click(screen.getByRole("button", { name: "Reassign Task" }));

    expect(await screen.findByText("assignee unchanged")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onError.mock.calls.every(([message]) => message === "")).toBe(true);
    expect(onReloadPage).not.toHaveBeenCalled();
  });

  it("closes the dialog after a confirmed stale reload", async () => {
    const user = userEvent.setup();
    vi.mocked(api.workflowReassignTask).mockRejectedValue(
      new HttpError(409, "stale action: record version mismatch", {
        error: "stale action: record version mismatch",
      }),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onClose = vi.fn();
    const onReloadPage = vi.fn().mockResolvedValue(undefined);

    render(
      <UiProvider>
        <WorkflowTimelineActionModals
          state={{ kind: "reassign-task", instance: makeInstance(), task: makeTask() }}
          onClose={onClose}
          vaultId="v1"
          objectName="study__v"
          recordId="r1"
          page={makePage()}
          onPageUpdate={vi.fn()}
          onError={vi.fn()}
          onReloadPage={onReloadPage}
        />
      </UiProvider>,
    );

    await user.click(screen.getByRole("button", { name: "pick-user" }));
    await user.click(screen.getByRole("button", { name: "Reassign Task" }));

    await waitFor(() => {
      expect(onReloadPage).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
