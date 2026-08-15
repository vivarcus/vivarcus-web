import { describe, expect, it, vi } from "vitest";
import { buildRecordActionMenuItems, sdkActionsForOverflowMenu } from "./recordActionMenuItems";
import { defaultPageActionLabels, displayText } from "../../lib/i18n";
import type { LifecycleAction, SdkAction } from "../../api/types";

describe("buildRecordActionMenuItems", () => {
  it("groups workflow and state actions like the record detail toolbar", () => {
    const actions: LifecycleAction[] = [
      {
        name: "select_country_useraction__c",
        label: { text: "Select Country" },
        order: 1000,
        kind: "start_workflow",
      },
      {
        name: "cancel_useraction__c",
        label: { text: "Cancel Study Country" },
        order: 2000,
        kind: "change_state",
      },
      {
        name: "archive_useraction__c",
        label: { text: "Archive" },
        order: 3000,
        display_in_all_actions_menu: true,
      },
    ];
    const items = buildRecordActionMenuItems({
      lifecycleActions: actions,
      onLifecycleAction: vi.fn(),
      editAllowed: true,
      onEdit: vi.fn(),
      deleteAllowed: true,
      onDelete: vi.fn(),
    });

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      key: "start-workflow-heading",
      label: displayText(defaultPageActionLabels.menu_group_start_workflow),
    });
    expect(items[1]).toMatchObject({
      key: "change-state-heading",
      label: displayText(defaultPageActionLabels.menu_group_change_state),
    });
    expect(items[2]).toMatchObject({
      key: "manage-heading",
      label: displayText(defaultPageActionLabels.menu_group_manage),
    });
    expect(items[3]).toMatchObject({
      key: "edit-heading",
      label: displayText(defaultPageActionLabels.menu_group_edit),
    });
    const editGroup = items[3] as { children?: Array<{ key?: string }> };
    expect(editGroup.children?.map((child) => child.key)).toEqual([
      "edit-record",
      "delete-record",
    ]);
  });

  it("keeps create draft in overflow but excludes document toolbar actions", () => {
    const sdkActions: SdkAction[] = [
      { name: "checkout__v", label: { text: "Check Out" }, order: 1 },
      { name: "download_source__v", label: { text: "Download Source" }, order: 2 },
      { name: "create_draft__v", label: { text: "Create Draft" }, order: 3 },
    ];
    expect(sdkActionsForOverflowMenu(sdkActions).map((a) => a.name)).toEqual(["create_draft__v"]);

    const items = buildRecordActionMenuItems({
      sdkActions,
      onLifecycleAction: vi.fn(),
      onSdkAction: vi.fn(),
    });
    expect(items).toHaveLength(1);
    expect(items?.[0]).toMatchObject({ key: "manage-heading" });
    const manage = items?.[0] as { children?: Array<{ key?: string; icon?: unknown }> };
    expect(manage.children?.map((child) => child.key)).toEqual(["sdk-create_draft__v"]);
    expect(manage.children?.[0]?.icon).toBeDefined();
  });
});
