import { beforeEach, describe, expect, it } from "vitest";
import {
  activeSelectDropdown,
  clickSelectOption,
  fieldLabelPattern,
  findFieldByApiName,
  findFieldByLabel,
  getPicklistSelection,
  listFormPicklistFields,
  selectPicklistField,
} from "./selectPicklistField";

function buildPicklistFieldDom({
  fieldApiName,
  label,
  selected,
  options,
  dropdownOpen = false,
}: {
  fieldApiName: string;
  label: string;
  selected?: string;
  options: string[];
  dropdownOpen?: boolean;
}) {
  document.body.innerHTML = `
    <div class="field-grid__item field-grid__item--edit" data-field-api-name="${fieldApiName}">
      <dt>${label}</dt>
      <dd>
        <div class="ant-select">
          <div role="combobox" tabindex="0" aria-expanded="${dropdownOpen}">
            ${selected ? `<span class="ant-select-selection-item">${selected}</span>` : ""}
            <input class="ant-select-selection-search-input" />
          </div>
        </div>
      </dd>
    </div>
    <div class="ant-select-dropdown ${dropdownOpen ? "" : "ant-select-dropdown-hidden"}">
      ${options
        .map(
          (option) =>
            `<div class="ant-select-item-option" role="option"><div class="ant-select-item-option-content">${option}</div></div>`,
        )
        .join("")}
    </div>
  `;
}

describe("fieldLabelPattern", () => {
  it("allows optional required asterisk", () => {
    expect(fieldLabelPattern("Study Phase").test("Study Phase*")).toBe(true);
    expect(fieldLabelPattern("Study Phase").test("Study Phase")).toBe(true);
  });
});

describe("findFieldByApiName", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div data-field-api-name="study_phase__v"></div>`;
  });

  it("finds field container by api name", () => {
    expect(findFieldByApiName("study_phase__v")?.getAttribute("data-field-api-name")).toBe(
      "study_phase__v",
    );
  });
});

describe("findFieldByLabel", () => {
  beforeEach(() => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase",
      options: [],
    });
  });

  it("finds field container by visible label", () => {
    expect(findFieldByLabel("Study Phase")?.getAttribute("data-field-api-name")).toBe(
      "study_phase__v",
    );
  });
});

describe("clickSelectOption", () => {
  beforeEach(() => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase",
      options: ["Phase I", "Phase III"],
      dropdownOpen: true,
    });
  });

  it("clicks matching option in active dropdown", () => {
    expect(clickSelectOption("Phase III")).toBe(true);
    expect(activeSelectDropdown()).not.toBeNull();
  });
});

describe("selectPicklistField", () => {
  it("returns ok when option is already selected", async () => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase",
      selected: "Phase III",
      options: ["Phase III"],
    });
    const item = findFieldByApiName("study_phase__v")!;
    await expect(selectPicklistField(item, "Phase III")).resolves.toEqual({ ok: true });
  });

  it("selects option from open dropdown", async () => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase",
      options: ["Phase I", "Phase III"],
      dropdownOpen: true,
    });
    document.body.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement | null)?.closest(".ant-select-item-option");
      if (!option) {
        return;
      }
      const label = option.textContent?.trim() ?? "";
      const combobox = findFieldByApiName("study_phase__v")?.querySelector('[role="combobox"]');
      if (!combobox || !label) {
        return;
      }
      combobox.innerHTML = `<span class="ant-select-selection-item">${label}</span><input class="ant-select-selection-search-input" />`;
    });
    const item = findFieldByApiName("study_phase__v")!;
    const result = await selectPicklistField(item, "Phase III");
    expect(result.ok).toBe(true);
    expect(getPicklistSelection(item)).toBe("Phase III");
  });
});

describe("listFormPicklistFields", () => {
  beforeEach(() => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase*",
      selected: "Phase III",
      options: [],
    });
  });

  it("lists picklist fields on the current form", () => {
    expect(listFormPicklistFields()).toEqual([
      {
        fieldApiName: "study_phase__v",
        label: "Study Phase",
        selected: "Phase III",
      },
    ]);
  });
});
