import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RecordToolbar } from "./RecordToolbar";
import { defaultPageActionLabels, defaultPageMessages, displayText } from "../lib/i18n";
import type { LifecycleAction, RecordPageModel, SdkAction } from "../api/types";

type ToolbarProps = ComponentProps<typeof RecordToolbar>;

function makePage(overrides: Partial<RecordPageModel> = {}): RecordPageModel {
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
    ...overrides,
  } as unknown as RecordPageModel;
}

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const props: ToolbarProps = {
    vaultId: "v1",
    objectName: "study__v",
    recordId: "r1",
    page: makePage(),
    onLifecycleAction: vi.fn(),
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <RecordToolbar {...props} />
    </MemoryRouter>,
  );
}

const EDIT_LABEL = displayText(defaultPageActionLabels.edit);
const WORKFLOW_STATE_LABEL = displayText(defaultPageActionLabels.workflow_and_state_change);

describe("RecordToolbar placement", () => {
  it("renders workflow and state actions in the gear menu, not as standalone buttons", () => {
    const actions: LifecycleAction[] = [
      {
        name: "select_country_useraction__c",
        label: { text: "Select Country" },
        order: 1000,
        kind: "start_workflow",
      },
      {
        name: "change_to_cancelled_useraction__c",
        label: { text: "Cancel Study Country" },
        order: 2000,
        kind: "change_state",
      },
    ];
    renderToolbar({ page: makePage({ lifecycle_actions: actions }) });

    expect(screen.getByRole("button", { name: WORKFLOW_STATE_LABEL })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select Country" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel Study Country" })).toBeNull();
  });

  it("keeps display-in-all-actions workflow actions out of direct buttons", () => {
    const actions: LifecycleAction[] = [
      {
        name: "metrics__c",
        label: { text: "Generate Metrics" },
        order: 2000,
        kind: "start_workflow",
        display_in_all_actions_menu: true,
      },
    ];
    renderToolbar({ page: makePage({ lifecycle_actions: actions }) });
    expect(screen.queryByRole("button", { name: "Generate Metrics" })).toBeNull();
    expect(screen.queryByRole("button", { name: WORKFLOW_STATE_LABEL })).toBeNull();
    expect(screen.getByRole("button", { name: displayText(defaultPageActionLabels.all_actions) })).toBeInTheDocument();
  });

  it("keeps sdk actions inside the menu, never as primary buttons", () => {
    const sdk: SdkAction = {
      name: "generate__c",
      label: { text: "Generate" },
      placement: "overflow",
    };
    renderToolbar({ page: makePage({ sdk_actions: [sdk] }) });
    expect(screen.queryByRole("button", { name: "Generate" })).toBeNull();
  });

  it("renders Edit alongside the workflow and state menu", () => {
    const actions: LifecycleAction[] = [
      {
        name: "select_country_useraction__c",
        label: { text: "Select Country" },
        order: 1000,
        kind: "start_workflow",
      },
    ];
    renderToolbar({ page: makePage({ lifecycle_actions: actions }) });
    expect(screen.getByRole("button", { name: WORKFLOW_STATE_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: EDIT_LABEL })).toBeInTheDocument();
  });

  it("shows audit under the View group when it is the only overflow item", async () => {
    const user = userEvent.setup();
    renderToolbar({
      page: makePage({
        audit: { visible: true },
        actions: {
          edit_allowed: true,
          delete_allowed: false,
          copy_allowed: false,
          labels: defaultPageActionLabels,
        },
      }),
      onAuditOpen: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: displayText(defaultPageActionLabels.all_actions) }));

    expect(screen.getByRole("menuitem", { name: displayText(defaultPageActionLabels.audit) })).toBeInTheDocument();
    expect(screen.getByText(displayText(defaultPageActionLabels.menu_group_view))).toBeInTheDocument();
  });

  it("shows Object Record as a toolbar shortcut on document records", () => {
    renderToolbar({
      objectName: "document__v",
      isDocumentObject: true,
      isDocumentSplit: true,
      tabApiName: "library__v",
      page: makePage({
        object_api_name: "document__v",
        object_label: { text: "Document" },
      }),
    });

    const shortcut = screen.getByRole("link", {
      name: displayText(defaultPageActionLabels.view_object_record, "Object Record"),
    });
    expect(shortcut).toHaveAttribute(
      "href",
      "/objects/document__v/records/r1?tab=library__v&page=object_record_page__v",
    );
  });

  it("shows View Document as a toolbar shortcut on the object record shell", () => {
    renderToolbar({
      objectName: "document__v",
      isDocumentObject: true,
      isDocumentSplit: false,
      pageApiName: "object_record_page__v",
      tabApiName: "library__v",
      page: makePage({
        object_api_name: "document__v",
        object_label: { text: "Document" },
      }),
    });

    const shortcut = screen.getByRole("link", {
      name: displayText(defaultPageActionLabels.view_document, "View Document"),
    });
    expect(shortcut).toHaveAttribute(
      "href",
      "/objects/document__v/records/r1?tab=library__v&page=document_page__v",
    );
  });

  it("shows Object Record as a toolbar shortcut on binder tree records", () => {
    renderToolbar({
      objectName: "document__v",
      isBinderTree: true,
      isBinderRecord: true,
      tabApiName: "library__v",
      page: makePage({
        object_api_name: "document__v",
        object_type_api_name: "binder__v",
        object_label: { text: "Document" },
      }),
    });

    const shortcut = screen.getByRole("link", {
      name: displayText(defaultPageActionLabels.view_object_record, "Object Record"),
    });
    expect(shortcut).toHaveAttribute(
      "href",
      "/objects/document__v/records/r1?tab=library__v&page=object_record_page__v",
    );
  });

  it("shows View Binder as a toolbar shortcut on the binder object record shell", () => {
    renderToolbar({
      objectName: "document__v",
      isBinderRecord: true,
      isBinderTree: false,
      pageApiName: "object_record_page__v",
      tabApiName: "library__v",
      page: makePage({
        object_api_name: "document__v",
        object_type_api_name: "binder__v",
        object_label: { text: "Document" },
      }),
    });

    const shortcut = screen.getByRole("link", {
      name: displayText(defaultPageActionLabels.view_binder, "View Binder"),
    });
    expect(shortcut).toHaveAttribute(
      "href",
      "/objects/document__v/records/r1?tab=library__v&page=document_page__v",
    );
  });
});
