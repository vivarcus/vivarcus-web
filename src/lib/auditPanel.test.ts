import { describe, expect, it } from "vitest";
import { parseAuditPanelKind } from "./auditPanel";

describe("parseAuditPanelKind", () => {
  it("accepts catalog sub_view keys", () => {
    expect(parseAuditPanelKind("system")).toBe("system");
    expect(parseAuditPanelKind("login")).toBe("login");
    expect(parseAuditPanelKind("domain")).toBe("domain");
    expect(parseAuditPanelKind("object_records")).toBe("object_records");
  });

  it("rejects unknown values", () => {
    expect(parseAuditPanelKind("vault_users")).toBeNull();
    expect(parseAuditPanelKind(null)).toBeNull();
  });
});
