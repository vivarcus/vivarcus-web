import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordSectionList } from "./RecordSectionList";

vi.mock("../api/client", () => ({
  api: {
    vqlQuery: vi.fn().mockResolvedValue({ records: [] }),
  },
}));

vi.mock("../context/UiContext", () => ({
  useUi: () => ({
    shell: {
      reference_select_record: { text: "Select record" },
      reference_loading_options: { text: "Loading…" },
      reference_load_failed: { text: "Failed to load" },
      reference_target_object: { text: "Target object: {object}" },
      please_select: { text: "Please select a parent field first" },
      depends_on_field: { text: "Depends on {field}" },
    },
  }),
}));

describe("RecordSectionList", () => {
  it("renders view sections whose elements are null after layout rules hide all fields", () => {
    render(
      <RecordSectionList
        mode="view"
        vaultId="vault-1"
        sections={[
          {
            name: "resolution_details__c",
            label: { text: "Resolution Details" },
            elements: null,
          },
        ]}
        expandedSections={new Set(["section-resolution_details__c"])}
        onToggleSection={() => {}}
      />,
    );

    expect(screen.getByText("Resolution Details")).toBeInTheDocument();
  });

  it("renders edit sections with detail grid fields", () => {
    render(
      <RecordSectionList
        mode="edit"
        vaultId="vault-1"
        sections={[
          {
            name: "details__c",
            label: { text: "Details" },
            elements: [
              {
                kind: "field",
                field_api_name: "name__v",
                label: { text: "Name" },
                field_type: "String",
              },
            ],
          },
        ]}
        values={{ name__v: "Alpha" }}
        onFieldChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alpha")).toBeInTheDocument();
  });

  it("shows empty state for view mode without sections", () => {
    render(
      <RecordSectionList
        mode="view"
        vaultId="vault-1"
        sections={[]}
        expandedSections={new Set()}
        onToggleSection={() => {}}
      />,
    );

    expect(screen.getByText("This layout has no visible field sections.")).toBeInTheDocument();
  });

  it("renders a help tooltip icon when the section carries help_content", () => {
    render(
      <RecordSectionList
        mode="view"
        vaultId="vault-1"
        sections={[
          {
            name: "milestones__c",
            label: { text: "Milestones" },
            help_content: "Displays study-level milestones.",
            elements: [
              {
                kind: "field",
                field_api_name: "name__v",
                label: { text: "Name" },
                field_type: "String",
              },
            ],
          },
        ]}
        expandedSections={new Set(["section-milestones__c"])}
        onToggleSection={() => {}}
      />,
    );

    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Section help" })).toBeInTheDocument();
  });

  it("does not render a help icon when help_content is absent", () => {
    render(
      <RecordSectionList
        mode="view"
        vaultId="vault-1"
        sections={[
          {
            name: "details__c",
            label: { text: "Details" },
            elements: [
              {
                kind: "field",
                field_api_name: "name__v",
                label: { text: "Name" },
                field_type: "String",
              },
            ],
          },
        ]}
        expandedSections={new Set(["section-details__c"])}
        onToggleSection={() => {}}
      />,
    );

    expect(screen.queryByRole("img", { name: "Section help" })).not.toBeInTheDocument();
  });

  it("renders a spacer as an empty grid cell between fields in view mode", () => {
    render(
      <RecordSectionList
        mode="view"
        vaultId="vault-1"
        sections={[
          {
            name: "details1__c",
            label: { text: "Study Configuration Details" },
            form_columns: 2,
            elements: [
              {
                kind: "field",
                field_api_name: "metric_calculation__v",
                label: { text: "Metric Calculation" },
                field_type: "String",
              },
              { kind: "spacer" },
              {
                kind: "field",
                field_api_name: "plat_edl_template__v",
                label: { text: "Plat EDL Template" },
                field_type: "String",
              },
            ],
          },
        ]}
        expandedSections={new Set(["section-details1__c"])}
        onToggleSection={() => {}}
      />,
    );

    const grid = document.querySelector(".field-grid--split-columns");
    expect(grid).not.toBeNull();
    const cells = Array.from(grid!.querySelectorAll(".field-grid__item"));
    expect(cells).toHaveLength(3);
    expect(cells[0].textContent).toContain("Metric Calculation");
    expect(cells[1]).toHaveClass("field-grid__item--spacer");
    expect(cells[1].textContent).toBe("");
    expect(cells[2].textContent).toContain("Plat EDL Template");
  });

  it("renders a spacer as an empty grid cell between fields in edit mode", () => {
    render(
      <RecordSectionList
        mode="edit"
        vaultId="vault-1"
        sections={[
          {
            name: "details1__c",
            label: { text: "Study Configuration Details" },
            form_columns: 2,
            elements: [
              {
                kind: "field",
                field_api_name: "metric_calculation__v",
                label: { text: "Metric Calculation" },
                field_type: "String",
              },
              { kind: "spacer" },
              {
                kind: "field",
                field_api_name: "plat_edl_template__v",
                label: { text: "Plat EDL Template" },
                field_type: "String",
              },
            ],
          },
        ]}
        values={{}}
        onFieldChange={() => {}}
      />,
    );

    const grid = document.querySelector(".field-grid--split-columns");
    expect(grid).not.toBeNull();
    const cells = Array.from(grid!.querySelectorAll(".field-grid__item"));
    expect(cells).toHaveLength(3);
    expect(cells[1]).toHaveClass("field-grid__item--spacer");
    expect(cells[2].textContent).toContain("Plat EDL Template");
  });

  it("keeps mobile in the left column when a layout control sits after email", () => {
    const fieldNames = [
      "object_type__v",
      "prefix__v",
      "first_name__sys",
      "middle_name__v",
      "last_name__sys",
      "suffix__v",
      "manager__sys",
      "email__sys",
      "mobile_phone__sys",
      "image__sys",
      "language__sys",
      "locale__sys",
      "timezone__sys",
      "vault_user__sys",
      "tax_id__v",
      "city__c",
    ];
    render(
      <RecordSectionList
        mode="edit"
        vaultId="vault-1"
        sections={[
          {
            name: "details__c",
            label: { text: "Details" },
            form_columns: 2,
            elements: [
              ...fieldNames.slice(0, 8).map((field_api_name) => ({
                kind: "field" as const,
                field_api_name,
                label: { text: field_api_name },
                field_type: "String",
              })),
              {
                kind: "control" as const,
                name: "duplicate_person_email_field_control__c",
              },
              ...fieldNames.slice(8).map((field_api_name) => ({
                kind: "field" as const,
                field_api_name,
                label: { text: field_api_name },
                field_type: "String",
              })),
            ],
          },
        ]}
        values={{}}
        onFieldChange={() => {}}
      />,
    );

    const grid = document.querySelector(".field-grid--split-columns");
    expect(grid).not.toBeNull();
    const columns = grid!.querySelectorAll(".field-grid__column");
    expect(columns).toHaveLength(2);
    const leftText = columns[0].textContent ?? "";
    const rightText = columns[1].textContent ?? "";
    expect(leftText).toContain("mobile_phone__sys");
    expect(leftText).toContain("email__sys");
    expect(rightText).toContain("image__sys");
    expect(rightText).not.toContain("mobile_phone__sys");
  });

  it("passes form values into reference fields for cascade unblocking", async () => {
    render(
      <RecordSectionList
        mode="edit"
        vaultId="vault-1"
        sections={[
          {
            name: "details__c",
            label: { text: "Details" },
            elements: [
              {
                kind: "field",
                field_api_name: "site__ctms",
                label: { text: "Site" },
                field_type: "Object",
                field_render: {
                  renderer_kind: "record_picker",
                  target_object_api_name: "site__v",
                  editability: "editable",
                },
              },
              {
                kind: "field",
                field_api_name: "subject__ctms",
                label: { text: "Subject" },
                field_type: "Object",
                field_render: {
                  renderer_kind: "record_picker",
                  target_object_api_name: "subject__clin",
                  editability: "editable",
                  controlling_field_api_name: "site__ctms",
                  relationship_criteria: "[site__clin = {{this.site__ctms}}]",
                },
              },
            ],
          },
        ]}
        values={{ site__ctms: "GOK000000000005" }}
        onFieldChange={() => {}}
      />,
    );

    const subjectSelect = screen.getByLabelText("Subject");
    await waitFor(() => {
      expect(subjectSelect).not.toBeDisabled();
    });
  });

  it("shows Depends on {controlling field} while the parent is empty", () => {
    render(
      <RecordSectionList
        mode="edit"
        vaultId="vault-1"
        sections={[
          {
            name: "details__c",
            label: { text: "Details" },
            elements: [
              {
                kind: "field",
                field_api_name: "study__v",
                label: { text: "Study" },
                field_type: "Object",
                field_render: {
                  renderer_kind: "record_picker",
                  target_object_api_name: "study__v",
                  editability: "editable",
                },
              },
              {
                kind: "field",
                field_api_name: "study_country__v",
                label: { text: "Study Country" },
                field_type: "Object",
                field_render: {
                  renderer_kind: "record_picker",
                  target_object_api_name: "study_country__v",
                  editability: "editable",
                  controlling_field_api_name: "study__v",
                },
              },
              {
                kind: "field",
                field_api_name: "site__v",
                label: { text: "Study Site" },
                field_type: "Object",
                field_render: {
                  renderer_kind: "record_picker",
                  target_object_api_name: "site__v",
                  editability: "editable",
                  controlling_field_api_name: "study_country__v",
                },
              },
            ],
          },
        ]}
        values={{}}
        onFieldChange={() => {}}
      />,
    );

    const country = screen.getByLabelText("Study Country");
    const site = screen.getByLabelText("Study Site");
    expect(country).toBeDisabled();
    expect(site).toBeDisabled();
    // Ant Select shows placeholder via .ant-select-selection-placeholder
    expect(country.closest(".ant-select")?.textContent).toContain("Depends on Study");
    expect(site.closest(".ant-select")?.textContent).toContain("Depends on Study Country");
  });
});
