import { describe, expect, it } from "vitest";
import type { LifecycleAction } from "../../api/types";
import { partitionLifecycleToolbarActions, resolveLifecycleActionKind } from "./lifecycleToolbarActions";

function action(overrides: Partial<LifecycleAction> & Pick<LifecycleAction, "name">): LifecycleAction {
  return {
    label: { text: overrides.name },
    ...overrides,
  };
}

describe("resolveLifecycleActionKind", () => {
  it("uses explicit kind when present", () => {
    expect(resolveLifecycleActionKind(action({ name: "a", kind: "start_workflow" }))).toBe(
      "start_workflow",
    );
    expect(resolveLifecycleActionKind(action({ name: "b", kind: "change_state" }))).toBe(
      "change_state",
    );
    expect(resolveLifecycleActionKind(action({ name: "c", kind: "object_action" }))).toBe("other");
    expect(resolveLifecycleActionKind(action({ name: "d", kind: "application_action" }))).toBe("other");
  });

  it("infers start workflow from dialog", () => {
    expect(
      resolveLifecycleActionKind(
        action({
          name: "wf",
          workflow_start_dialog: { controls: [{ type: "instructions", instructions: "Go" }] },
        }),
      ),
    ).toBe("start_workflow");
  });

  it("defaults to all-actions placement without kind or dialog", () => {
    expect(resolveLifecycleActionKind(action({ name: "st" }))).toBe("other");
  });
});

describe("partitionLifecycleToolbarActions", () => {
  it("splits workflow and state actions for the gear menu", () => {
    const { startWorkflow, changeState, allActionsMenu } = partitionLifecycleToolbarActions([
      action({ name: "cancel", kind: "change_state", order: 2000 }),
      action({ name: "select", kind: "start_workflow", order: 1000 }),
    ]);
    expect(startWorkflow.map((a) => a.name)).toEqual(["select"]);
    expect(changeState.map((a) => a.name)).toEqual(["cancel"]);
    expect(allActionsMenu).toEqual([]);
  });

  it("routes display-in-all-actions workflow actions only to all actions menu", () => {
    const { startWorkflow, changeState, allActionsMenu } = partitionLifecycleToolbarActions([
      action({
        name: "metrics",
        kind: "start_workflow",
        display_in_all_actions_menu: true,
      }),
    ]);
    expect(startWorkflow).toEqual([]);
    expect(changeState).toEqual([]);
    expect(allActionsMenu.map((a) => a.name)).toEqual(["metrics"]);
  });

  it("matches study planning placement: state change vs all actions", () => {
    const { startWorkflow, changeState, allActionsMenu } = partitionLifecycleToolbarActions([
      action({ name: "ready_to_enroll_useraction__c", kind: "change_state", order: 1000 }),
      action({ name: "create_ad_hoc_event_useraction4__c", kind: "application_action", order: 2000 }),
      action({
        name: "plan_subject_recruitment_useraction1__c",
        kind: "start_workflow",
        display_in_all_actions_menu: true,
        order: 3000,
      }),
      action({ name: "recalculate_metrics_useraction__c", kind: "application_action", order: 4000 }),
      action({ name: "create_country_budget_records_useractio1__c", kind: "object_action", order: 5000 }),
    ]);
    expect(startWorkflow.map((a) => a.name)).toEqual([]);
    expect(changeState.map((a) => a.name)).toEqual(["ready_to_enroll_useraction__c"]);
    expect(allActionsMenu.map((a) => a.name)).toEqual([
      "create_ad_hoc_event_useraction4__c",
      "plan_subject_recruitment_useraction1__c",
      "recalculate_metrics_useraction__c",
      "create_country_budget_records_useractio1__c",
    ]);
  });
});
