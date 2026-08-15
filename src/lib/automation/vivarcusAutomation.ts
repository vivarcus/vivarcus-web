import {
  findFieldByApiName,
  findFieldByLabel,
  getPicklistSelection,
  listFormPicklistFields,
  selectPicklistField,
  type FormPicklistFieldInfo,
} from "./selectPicklistField";

export type SelectPicklistResult = {
  ok: boolean;
  fieldApiName?: string;
  optionLabel?: string;
  reason?: string;
};

export type VivarcusAutomation = {
  selectPicklist: (fieldApiName: string, optionLabel: string) => Promise<SelectPicklistResult>;
  selectPicklistByLabel: (fieldLabel: string, optionLabel: string) => Promise<SelectPicklistResult>;
  getPicklistSelection: (fieldApiName: string) => string | null;
  listFormPicklistFields: () => FormPicklistFieldInfo[];
};

async function selectPicklistOnField(
  item: HTMLElement,
  fieldApiName: string,
  optionLabel: string,
): Promise<SelectPicklistResult> {
  const result = await selectPicklistField(item, optionLabel);
  return {
    ok: result.ok,
    fieldApiName,
    optionLabel,
    reason: result.reason,
  };
}

export function createVivarcusAutomation(): VivarcusAutomation {
  return {
    async selectPicklist(fieldApiName, optionLabel) {
      const trimmedField = fieldApiName.trim();
      const trimmedOption = optionLabel.trim();
      if (!trimmedField || !trimmedOption) {
        return { ok: false, reason: "fieldApiName and optionLabel are required" };
      }
      const item = findFieldByApiName(trimmedField);
      if (!item) {
        return { ok: false, fieldApiName: trimmedField, reason: `field not found: ${trimmedField}` };
      }
      return selectPicklistOnField(item, trimmedField, trimmedOption);
    },

    async selectPicklistByLabel(fieldLabel, optionLabel) {
      const trimmedLabel = fieldLabel.trim();
      const trimmedOption = optionLabel.trim();
      if (!trimmedLabel || !trimmedOption) {
        return { ok: false, reason: "fieldLabel and optionLabel are required" };
      }
      const item = findFieldByLabel(trimmedLabel);
      if (!item) {
        return { ok: false, reason: `field not found by label: ${trimmedLabel}` };
      }
      const fieldApiName = item.getAttribute("data-field-api-name")?.trim() ?? trimmedLabel;
      return selectPicklistOnField(item, fieldApiName, trimmedOption);
    },

    getPicklistSelection(fieldApiName) {
      const item = findFieldByApiName(fieldApiName.trim());
      if (!item) {
        return null;
      }
      return getPicklistSelection(item);
    },

    listFormPicklistFields,
  };
}
