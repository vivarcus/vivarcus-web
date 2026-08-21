import { describe, expect, it } from "vitest";
import type { ObjectTypeOption } from "../api/types";
import { pickDefaultObjectType } from "./createObjectType";

describe("pickDefaultObjectType", () => {
  const types: ObjectTypeOption[] = [
    { api_name: "observation__v", label: { value: "Observation" } },
    { api_name: "protocol_deviation__ctms", label: { value: "Protocol Deviation" } },
  ];

  it("prefers explicit default when present in options", () => {
    expect(pickDefaultObjectType(types, "protocol_deviation__ctms")).toBe(
      "protocol_deviation__ctms",
    );
  });

  it("falls back to first option when preferred default is missing", () => {
    expect(pickDefaultObjectType(types, "missing__v")).toBe("observation__v");
  });

  it("matches a preferred object type by label", () => {
    expect(pickDefaultObjectType(types, "Protocol Deviation")).toBe("protocol_deviation__ctms");
  });
});
