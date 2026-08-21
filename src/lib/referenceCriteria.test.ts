import { describe, expect, it } from "vitest";
import {
  appendReferenceCriteriaToVql,
  fixedFieldsFromRelationshipCriteria,
  objectTypeFromRelationshipCriteria,
  parseReferenceCriteriaClauses,
  relationshipCriteriaSourceFields,
} from "./referenceCriteria";

describe("parseReferenceCriteriaClauses", () => {
  it("parses study-level EDL criteria", () => {
    expect(parseReferenceCriteriaClauses("[level__v = 'study_level__v']")).toEqual([
      { field: "level__v", literal: "study_level__v" },
    ]);
  });

  it("parses object type name relationship criteria", () => {
    expect(
      parseReferenceCriteriaClauses("[object_type__vr.name__v = 'Institution']"),
    ).toEqual([{ field: "object_type__vr.name__v", literal: "Institution" }]);
  });

  it("parses dynamic parent reference", () => {
    expect(
      parseReferenceCriteriaClauses(
        "[level__v = 'subtype__v' AND parent_type__v = {{this.type__v}}]",
      ),
    ).toEqual([
      { field: "level__v", literal: "subtype__v" },
      { field: "parent_type__v", sourceField: "type__v" },
    ]);
  });

  it("rejects subquery criteria", () => {
    expect(
      parseReferenceCriteriaClauses(
        "[id IN (SELECT locale__sys FROM language_locale__sysr WHERE language__sys = {{this.language__sys}})]",
      ),
    ).toBeNull();
  });
});

describe("appendReferenceCriteriaToVql", () => {
  it("filters edl_template__v to study level", () => {
    const query = appendReferenceCriteriaToVql(
      "SELECT id, name__v FROM edl_template__v LIMIT 50",
      "[level__v = 'study_level__v']",
      {},
    );
    expect(query).toBe(
      "SELECT level__v, id, name__v FROM edl_template__v WHERE level__v = 'study_level__v' LIMIT 50",
    );
  });

  it("returns null when a source field is missing", () => {
    const query = appendReferenceCriteriaToVql(
      "SELECT id, name__v FROM document_type__v LIMIT 50",
      "[level__v = 'subtype__v' AND parent_type__v = {{this.type__v}}]",
      {},
    );
    expect(query).toBeNull();
  });

  it("filters organizations to Institution object type without selecting the lookup path", () => {
    const query = appendReferenceCriteriaToVql(
      "SELECT id, name__v FROM organization__v LIMIT 50",
      "[object_type__vr.name__v = 'Institution']",
      {},
    );
    expect(query).toBe(
      "SELECT id, name__v FROM organization__v WHERE object_type__vr.name__v = 'Institution' LIMIT 50",
    );
  });

  it("keeps ORDER BY ahead of LIMIT when inserting WHERE", () => {
    const query = appendReferenceCriteriaToVql(
      "SELECT id, name__v, state__v FROM study_country__v ORDER BY created_date__v DESC LIMIT 50",
      "[study__v = {{this.study__clin}}]",
      { study__clin: "0ST000000002001" },
    );
    expect(query).toBe(
      "SELECT study__v, id, name__v, state__v FROM study_country__v " +
        "WHERE study__v = '0ST000000002001' ORDER BY created_date__v DESC LIMIT 50",
    );
  });
});

describe("relationshipCriteriaSourceFields", () => {
  it("collects this-binding fields", () => {
    expect(
      relationshipCriteriaSourceFields(
        "[parent_type__v = {{this.type__v}}]",
      ),
    ).toEqual(["type__v"]);
  });
});

describe("fixedFieldsFromRelationshipCriteria", () => {
  it("fixes study__ctms from clinical user task study__clin", () => {
    expect(
      fixedFieldsFromRelationshipCriteria("[study__ctms = {{this.study__clin}}]", {
        study__clin: "0ST000000002001",
      }),
    ).toEqual([
      { field: "study__ctms", value: "0ST000000002001", sourceField: "study__clin" },
    ]);
  });

  it("does not treat object type lookup clauses as create-form field defaults", () => {
    expect(
      fixedFieldsFromRelationshipCriteria("[object_type__vr.name__v = 'Institution']", {}),
    ).toEqual([]);
  });
});

describe("objectTypeFromRelationshipCriteria", () => {
  it("maps Institution name criteria to the institution__v object type", () => {
    expect(
      objectTypeFromRelationshipCriteria("[object_type__vr.name__v = 'Institution']"),
    ).toBe("institution__v");
  });

  it("keeps api_name literals as object type api names", () => {
    expect(
      objectTypeFromRelationshipCriteria("[object_type__vr.api_name__v = 'investigator__v']"),
    ).toBe("investigator__v");
  });

  it("maps Investigator name criteria used by principal investigator", () => {
    expect(
      objectTypeFromRelationshipCriteria("[object_type__vr.name__v = 'Investigator']"),
    ).toBe("investigator__v");
  });
});
