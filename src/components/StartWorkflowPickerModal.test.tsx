import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StartWorkflowPickerModal } from "./StartWorkflowPickerModal";
import { UiProvider } from "../context/UiContext";

describe("StartWorkflowPickerModal", () => {
  it("lets the user pick one of several startable workflows", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <UiProvider>
        <StartWorkflowPickerModal
          open
          actions={[
            { name: "start_review__c", label: "Start Review" },
            { name: "start_approval__c", label: "Start Approval" },
          ]}
          onCancel={vi.fn()}
          onSelect={onSelect}
        />
      </UiProvider>,
    );

    expect(screen.getByText("Select a workflow")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Start Approval" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSelect).toHaveBeenCalledWith({
      name: "start_approval__c",
      label: "Start Approval",
    });
  });
});
