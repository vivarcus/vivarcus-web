import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { LifecycleStagesChevron } from "./LifecycleStagesChevron";
import { UiProvider } from "../context/UiContext";

function renderChevron(
  chevron: NonNullable<ComponentProps<typeof LifecycleStagesChevron>["chevron"]>,
) {
  return render(
    <UiProvider>
      <LifecycleStagesChevron chevron={chevron} />
    </UiProvider>,
  );
}

describe("LifecycleStagesChevron", () => {
  it("renders equal-width stage labels with current step marked", () => {
    renderChevron({
      visible: true,
      stages: [
        { api_name: "candidate__c", label: { text: "Candidate" }, current: false },
        { api_name: "planning__c", label: { text: "Planning" }, current: true },
        { api_name: "active__c", label: { text: "Active" }, current: false },
      ],
    });

    expect(screen.getByText("Candidate").closest("li")).toHaveClass(
      "lifecycle-chevron__stage--past",
      "lifecycle-chevron__stage--first",
    );
    expect(screen.getByText("Planning").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Active").closest("li")).toHaveClass(
      "lifecycle-chevron__stage--future",
      "lifecycle-chevron__stage--last",
    );
  });

  it("returns null when chevron is hidden", () => {
    const { container } = renderChevron({ visible: false, stages: [] });
    expect(container).toBeEmptyDOMElement();
  });
});
