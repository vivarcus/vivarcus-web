import { describe, expect, it } from "vitest";
import {
  applyLoadedRecordFormValues,
  isRecordEditFormReady,
  shouldShowRecordEditLoading,
} from "./recordEditFormLoad";

describe("isRecordEditFormReady", () => {
  it("is false until the edit model has loaded", () => {
    expect(
      isRecordEditFormReady({
        editing: true,
        formLoading: true,
        hasForm: false,
      }),
    ).toBe(false);
    expect(
      isRecordEditFormReady({
        editing: true,
        formLoading: false,
        hasForm: true,
      }),
    ).toBe(true);
  });
});

describe("shouldShowRecordEditLoading", () => {
  it("keeps a loading mask on /edit before the form is interactive", () => {
    expect(
      shouldShowRecordEditLoading({
        isEditRoute: true,
        editing: false,
        formLoading: false,
        hasForm: false,
      }),
    ).toBe(true);
    expect(
      shouldShowRecordEditLoading({
        isEditRoute: true,
        editing: true,
        formLoading: true,
        hasForm: false,
      }),
    ).toBe(true);
    expect(
      shouldShowRecordEditLoading({
        isEditRoute: true,
        editing: true,
        formLoading: false,
        hasForm: true,
      }),
    ).toBe(false);
  });

  it("does not mask the detail view when not editing", () => {
    expect(
      shouldShowRecordEditLoading({
        isEditRoute: false,
        editing: false,
        formLoading: false,
        hasForm: false,
      }),
    ).toBe(false);
  });
});

describe("applyLoadedRecordFormValues", () => {
  it("ignores a stale fetch that finishes after a newer load started", () => {
    expect(
      applyLoadedRecordFormValues({
        loadId: 1,
        activeLoadId: 2,
        loadedValues: { planned__ctms: 0 },
        currentValues: { planned__ctms: 80 },
        isDirty: true,
      }),
    ).toBeNull();
  });

  it("keeps in-progress user edits instead of resetting to server values", () => {
    expect(
      applyLoadedRecordFormValues({
        loadId: 2,
        activeLoadId: 2,
        loadedValues: { planned__ctms: 0, study__v: "S-1" },
        currentValues: { planned__ctms: 80 },
        isDirty: true,
      }),
    ).toEqual({ planned__ctms: 80 });
  });

  it("applies server values when the form is still pristine", () => {
    expect(
      applyLoadedRecordFormValues({
        loadId: 1,
        activeLoadId: 1,
        loadedValues: { planned__ctms: 0, study__v: "S-1" },
        currentValues: {},
        isDirty: false,
      }),
    ).toEqual({ planned__ctms: 0, study__v: "S-1" });
  });
});
