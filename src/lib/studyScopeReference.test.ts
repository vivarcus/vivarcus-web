import { describe, expect, it, beforeEach } from "vitest";
import {
  EXCLUDED_LIFECYCLE_STATE,
  REFERENCE_PLAIN_LABEL_CACHE_MAX,
  clearReferencePlainLabelCache,
  collectFormReferenceDisplayContext,
  dependsOnControllingFieldHint,
  filterStudyScopeReferenceRecords,
  formatControllingFieldReferenceLabel,
  leafDisplaySegment,
  lookupReferencePlainLabel,
  rememberReferencePlainLabel,
  referenceRecordByIdQuery,
  resolveEffectiveReferenceCriteria,
  studyScopeReferenceQuery,
  synthesizeControllingFieldCriteria,
} from "./studyScopeReference";

describe("referenceRecordByIdQuery", () => {
  it("builds a single-record lookup by id", () => {
    expect(referenceRecordByIdQuery("milestone__v", "EZD00000000002X")).toBe(
      "SELECT id, name__v FROM milestone__v WHERE id = 'EZD00000000002X' LIMIT 1",
    );
  });
});

describe("studyScopeReferenceQuery", () => {
  it("adds lifecycle state for study hierarchy pickers without parent name joins", () => {
    expect(studyScopeReferenceQuery("study__v")).toBe(
      "SELECT id, name__v, state__v FROM study__v ORDER BY created_date__v DESC LIMIT 50",
    );
    expect(studyScopeReferenceQuery("study_country__v")).toBe(
      "SELECT id, name__v, state__v FROM study_country__v ORDER BY created_date__v DESC LIMIT 50",
    );
    expect(studyScopeReferenceQuery("site__v")).toBe(
      "SELECT id, name__v, state__v FROM site__v ORDER BY created_date__v DESC LIMIT 50",
    );
  });

  it("excludes system-owned users from user__sys pickers", () => {
    const query = studyScopeReferenceQuery("user__sys");
    expect(query).toContain("FROM user__sys");
    expect(query).toContain("system_owned_user__sys = false");
    expect(query).toContain("system_owned_user__sys = null");
    expect(query).not.toContain("domain_user_id__sys");
  });
});

describe("rememberReferencePlainLabel", () => {
  beforeEach(() => {
    clearReferencePlainLabelCache();
  });

  it("evicts the oldest entry when the cache exceeds its cap", () => {
    const last = REFERENCE_PLAIN_LABEL_CACHE_MAX;
    for (let i = 0; i <= last; i++) {
      rememberReferencePlainLabel(`R${i}`, `Label ${i}`);
    }
    expect(lookupReferencePlainLabel("R0")).toBe("");
    expect(lookupReferencePlainLabel("R1")).toBe("Label 1");
    expect(lookupReferencePlainLabel(`R${last}`)).toBe(`Label ${last}`);
  });

  it("refreshes an existing entry without evicting others", () => {
    rememberReferencePlainLabel("R1", "First");
    rememberReferencePlainLabel("R2", "Second");
    rememberReferencePlainLabel("R1", "Updated");
    expect(lookupReferencePlainLabel("R1")).toBe("Updated");
    expect(lookupReferencePlainLabel("R2")).toBe("Second");
  });

  it("treats a rewritten entry as newest so it survives later eviction", () => {
    rememberReferencePlainLabel("keep", "Keep");
    for (let i = 0; i < REFERENCE_PLAIN_LABEL_CACHE_MAX - 1; i++) {
      rememberReferencePlainLabel(`R${i}`, `Label ${i}`);
    }
    rememberReferencePlainLabel("keep", "Keep");
    rememberReferencePlainLabel("new", "New");
    expect(lookupReferencePlainLabel("keep")).toBe("Keep");
    expect(lookupReferencePlainLabel("R0")).toBe("");
  });

  it("treats a looked-up entry as newest so it survives later eviction", () => {
    rememberReferencePlainLabel("keep", "Keep");
    for (let i = 0; i < REFERENCE_PLAIN_LABEL_CACHE_MAX - 1; i++) {
      rememberReferencePlainLabel(`R${i}`, `Label ${i}`);
    }
    expect(lookupReferencePlainLabel("keep")).toBe("Keep");
    rememberReferencePlainLabel("new", "New");
    expect(lookupReferencePlainLabel("keep")).toBe("Keep");
    expect(lookupReferencePlainLabel("R0")).toBe("");
  });
});

describe("formatControllingFieldReferenceLabel", () => {
  beforeEach(() => {
    clearReferencePlainLabelCache();
  });

  it("returns plain name when there is no controlling field", () => {
    expect(
      formatControllingFieldReferenceLabel("China", "C1", undefined, {}, {}, {}),
    ).toBe("China");
  });

  it("formats study country as study > country from form displays", () => {
    expect(
      formatControllingFieldReferenceLabel(
        "China",
        "C1",
        "study__v",
        {},
        { study__v: "Study 1" },
        { study__v: "S1" },
      ),
    ).toBe("Study 1 > China");
  });

  it("formats site using controlling chain and leaf segments of hierarchical ancestors", () => {
    expect(
      formatControllingFieldReferenceLabel(
        "Site 001",
        "T1",
        "study_country__v",
        { study_country__v: "study__v" },
        {
          study__v: "Study 1",
          study_country__v: "Study 1 > China",
        },
        { study__v: "S1", study_country__v: "C1" },
      ),
    ).toBe("Study 1 > China > Site 001");
  });

  it("prefers cached plain labels for controller record ids", () => {
    rememberReferencePlainLabel("S1", "Study 1");
    rememberReferencePlainLabel("C1", "China");
    expect(
      formatControllingFieldReferenceLabel(
        "Site 001",
        "T1",
        "study_country__v",
        { study_country__v: "study__v" },
        {},
        { study__v: "S1", study_country__v: "C1" },
      ),
    ).toBe("Study 1 > China > Site 001");
  });
});

describe("leafDisplaySegment", () => {
  it("returns the last path segment", () => {
    expect(leafDisplaySegment("Study 1 > China")).toBe("China");
    expect(leafDisplaySegment("Study 1")).toBe("Study 1");
  });
});

describe("collectFormReferenceDisplayContext", () => {
  it("collects controlling parents, labels, and display values", () => {
    const ctx = collectFormReferenceDisplayContext([
      {
        elements: [
          {
            field_api_name: "study__v",
            label: { text: "Study" },
            field_render: { display_value: "Study 1" },
          },
          {
            field_api_name: "study_country__v",
            label: { text: "Study Country" },
            field_render: {
              controlling_field_api_name: "study__v",
              display_value: "Study 1 > China",
            },
          },
        ],
      },
    ]);
    expect(ctx.controllingParents).toEqual({ study_country__v: "study__v" });
    expect(ctx.formFieldDisplays.study__v).toBe("Study 1");
    expect(ctx.formFieldLabels).toEqual({
      study__v: "Study",
      study_country__v: "Study Country",
    });
  });
});

describe("dependsOnControllingFieldHint", () => {
  it("builds a Veeva-style Depends on hint from the controlling field label", () => {
    expect(
      dependsOnControllingFieldHint("Depends on {field}", "study__v", {
        study__v: "Study",
      }),
    ).toBe("Depends on Study");
  });

  it("falls back to the controlling field api name when label is missing", () => {
    expect(dependsOnControllingFieldHint("Depends on {field}", "study__v", {})).toBe(
      "Depends on study__v",
    );
  });

  it("returns empty when there is no controlling field", () => {
    expect(dependsOnControllingFieldHint("Depends on {field}", undefined, {})).toBe("");
  });
});

describe("synthesizeControllingFieldCriteria", () => {
  it("builds study country filter from controlling study field", () => {
    expect(synthesizeControllingFieldCriteria("study_country__v", "study__clin")).toBe(
      "[study__v = {{this.study__clin}}]",
    );
  });

  it("builds site filter from controlling study country field", () => {
    expect(synthesizeControllingFieldCriteria("site__v", "study_country__clin")).toBe(
      "[study_country__v = {{this.study_country__clin}}]",
    );
  });

  it("falls back to study filter for site when controller is study", () => {
    expect(synthesizeControllingFieldCriteria("site__v", "study__clin")).toBe(
      "[study__v = {{this.study__clin}}]",
    );
  });

  it("returns empty when there is no controlling field", () => {
    expect(synthesizeControllingFieldCriteria("study_country__v", undefined)).toBe("");
  });
});

describe("resolveEffectiveReferenceCriteria", () => {
  it("prefers explicit relationship_criteria", () => {
    expect(
      resolveEffectiveReferenceCriteria(
        "study_country__v",
        "[study__v = {{this.study__v}}]",
        "study__clin",
      ),
    ).toBe("[study__v = {{this.study__v}}]");
  });

  it("synthesizes criteria when relationship_criteria is empty", () => {
    expect(
      resolveEffectiveReferenceCriteria("study_country__v", "", "study__clin"),
    ).toBe("[study__v = {{this.study__clin}}]");
  });
});

describe("filterStudyScopeReferenceRecords", () => {
  it("removes excluded hierarchy nodes from picker options", () => {
    const filtered = filterStudyScopeReferenceRecords("study_country__v", [
      { record_id: "C1", fields: { state__v: "active_state__v" } },
      { record_id: "C2", fields: { state__v: EXCLUDED_LIFECYCLE_STATE } },
    ]);
    expect(filtered.map((row) => row.record_id)).toEqual(["C1"]);
  });

  it("removes system-owned user__sys rows", () => {
    const filtered = filterStudyScopeReferenceRecords("user__sys", [
      { record_id: "U1", fields: { system_owned_user__sys: false } },
      { record_id: "U2", fields: { system_owned_user__sys: true } },
      { record_id: "U3", fields: {} },
    ]);
    expect(filtered.map((row) => row.record_id)).toEqual(["U1", "U3"]);
  });
});
