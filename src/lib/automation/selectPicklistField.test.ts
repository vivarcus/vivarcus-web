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
  searchable = true,
}: {
  fieldApiName: string;
  label: string;
  selected?: string;
  options: string[];
  dropdownOpen?: boolean;
  searchable?: boolean;
}) {
  const searchInput = searchable
    ? `<input class="ant-select-selection-search-input" />`
    : `<input class="ant-select-selection-search-input" readonly style="display:none" />`;
  document.body.innerHTML = `
    <div class="field-grid__item field-grid__item--edit" data-field-api-name="${fieldApiName}">
      <dt>${label}</dt>
      <dd>
        <div class="ant-select">
          <div role="combobox" tabindex="0" aria-expanded="${dropdownOpen}">
            ${selected ? `<span class="ant-select-selection-item">${selected}</span>` : ""}
            ${searchInput}
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

function wireOptionSelection(fieldApiName: string) {
  document.body.addEventListener("click", (event) => {
    const option = (event.target as HTMLElement | null)?.closest(".ant-select-item-option");
    if (!option) {
      return;
    }
    const label = option.textContent?.trim() ?? "";
    const combobox = findFieldByApiName(fieldApiName)?.querySelector('[role="combobox"]');
    if (!combobox || !label) {
      return;
    }
    combobox.innerHTML = `<span class="ant-select-selection-item">${label}</span>`;
  });
}

/** Ant Design cold open: portal options appear after the last open gesture, not a fixed 300ms. */
function wireColdDropdown(openDelayMs: number) {
  const dropdown = document.querySelector(".ant-select-dropdown");
  const combobox = document.querySelector<HTMLElement>('[role="combobox"]');
  if (!dropdown || !combobox) {
    throw new Error("cold dropdown fixture missing");
  }
  let openTimer: number | undefined;
  const scheduleOpen = () => {
    window.clearTimeout(openTimer);
    dropdown.classList.add("ant-select-dropdown-hidden");
    openTimer = window.setTimeout(() => {
      dropdown.classList.remove("ant-select-dropdown-hidden");
    }, openDelayMs);
  };
  combobox.addEventListener("mousedown", scheduleOpen);
  combobox.addEventListener("click", scheduleOpen);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    window.clearTimeout(openTimer);
    dropdown.classList.add("ant-select-dropdown-hidden");
  });
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

  it("ignores the hidden ARIA listbox whose options are UUIDs", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div role="listbox" style="height:0;overflow:hidden">
        <div role="option">aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</div>
        <div role="option">Phase III</div>
      </div>`,
    );
    const hidden = [...document.querySelectorAll('[role="option"]')].find(
      (el) => el.textContent === "Phase III" && !el.classList.contains("ant-select-item-option"),
    );
    let hiddenClicked = false;
    hidden?.addEventListener("click", () => {
      hiddenClicked = true;
    });
    expect(clickSelectOption("Phase III")).toBe(true);
    expect(hiddenClicked).toBe(false);
    expect(clickSelectOption("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(false);
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
    wireOptionSelection("study_phase__v");
    const item = findFieldByApiName("study_phase__v")!;
    const result = await selectPicklistField(item, "Phase III");
    expect(result.ok).toBe(true);
    expect(getPicklistSelection(item)).toBe("Phase III");
  });

  it("closes the dropdown after a successful select", async () => {
    buildPicklistFieldDom({
      fieldApiName: "study_phase__v",
      label: "Study Phase",
      options: ["Phase I", "Phase III"],
      dropdownOpen: true,
    });
    wireOptionSelection("study_phase__v");
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.querySelector(".ant-select-dropdown")?.classList.add("ant-select-dropdown-hidden");
      }
    });
    const item = findFieldByApiName("study_phase__v")!;
    await expect(selectPicklistField(item, "Phase III")).resolves.toEqual({ ok: true });
    expect(activeSelectDropdown()).toBeNull();
  });

  it("selects option after a cold dropdown slower than 300ms", async () => {
    buildPicklistFieldDom({
      fieldApiName: "status__c",
      label: "Status",
      options: ["Draft", "Active"],
      dropdownOpen: false,
      searchable: false,
    });
    wireColdDropdown(600);
    wireOptionSelection("status__c");
    const item = findFieldByApiName("status__c")!;
    const result = await selectPicklistField(item, "Draft");
    expect(result).toEqual({ ok: true });
    expect(getPicklistSelection(item)).toBe("Draft");
  });
});

describe("findFieldByLabel workflow start controls", () => {
  it("finds reviewer pickers by label and api name", () => {
    document.body.innerHTML = `
      <div class="workflow-start-control" data-field-api-name="reviewers__c">
        <div class="ant-form-item-label">
          <label>
            <span>审查者</span>
            <span>已分配</span>
          </label>
        </div>
        <div class="ant-select">
          <div role="combobox"></div>
        </div>
      </div>
    `;
    expect(findFieldByLabel("审查者")?.getAttribute("data-field-api-name")).toBe("reviewers__c");
    expect(findFieldByApiName("reviewers__c")).not.toBeNull();
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
