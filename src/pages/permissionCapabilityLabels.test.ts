import { describe, expect, it } from "vitest";
import type { ShellChrome } from "../lib/i18n";
import { capabilityKeyLabel, capabilitySectionEntryLabel, capabilitySectionLabel } from "./permissionCapabilityLabels";

// shellWith builds a partial shell chrome whose capability fields carry the given text; fields not
// provided are undefined so the resolver exercises its humanize fallback.
function shellWith(fields: Record<string, string>): ShellChrome {
  const shell: Record<string, { text: string }> = {};
  for (const [key, text] of Object.entries(fields)) shell[key] = { text };
  return shell as unknown as ShellChrome;
}

describe("capabilityKeyLabel", () => {
  const en = shellWith({
    metadata_capability_security: "Security",
    metadata_capability_users: "Users",
    metadata_capability_vault_actions: "Vault Actions",
    metadata_capability_workflow: "Workflow",
    metadata_capability_configuration: "Configuration",
    metadata_capability_settings: "Settings",
    metadata_capability_language_region: "Language & Region",
    metadata_capability_vault_owner_actions: "Vault Owner Actions",
    metadata_permission_section_other: "Other",
  });
  const zh = shellWith({
    metadata_capability_security: "安全",
    metadata_capability_users: "用户",
    metadata_capability_vault_actions: "Vault 操作",
    metadata_capability_workflow: "工作流",
    metadata_capability_configuration: "配置",
    metadata_capability_permission_sets: "权限集",
  });

  it("composes dotted capability keys from the shell chrome (English)", () => {
    expect(capabilityKeyLabel("security.users", en)).toBe("Security · Users");
    expect(capabilityKeyLabel("vault_actions.workflow", en)).toBe("Vault Actions · Workflow");
    expect(capabilityKeyLabel("configuration.settings.language_region", en)).toBe(
      "Configuration · Settings · Language & Region",
    );
    expect(capabilityKeyLabel("vault_owner_actions", en)).toBe("Vault Owner Actions");
  });

  it("drops the section family prefix inside a titled Veeva section", () => {
    expect(capabilitySectionEntryLabel("security.users", "security", en)).toBe("Users");
    expect(capabilitySectionEntryLabel("vault_actions.workflow", "vault_actions", en)).toBe(
      "Workflow",
    );
    expect(
      capabilitySectionEntryLabel("configuration.settings.language_region", "settings", en),
    ).toBe("Language & Region");
    expect(capabilitySectionEntryLabel("vault_owner_actions", "vault_owner_actions", en)).toBe(
      "Vault Owner Actions",
    );
    expect(capabilitySectionLabel("configuration", en)).toBe("Configuration");
  });

  it("composes dotted capability keys from the shell chrome (Simplified Chinese)", () => {
    expect(capabilityKeyLabel("security.users", zh)).toBe("安全 · 用户");
    expect(capabilityKeyLabel("vault_actions.workflow", zh)).toBe("Vault 操作 · 工作流");
    expect(capabilityKeyLabel("configuration.permission_sets", zh)).toBe("配置 · 权限集");
  });

  it("drops a redundant trailing *_actions segment", () => {
    expect(capabilityKeyLabel("tab.home__v.tab_actions", en)).toBe("Tab · Home");
  });

  it("falls back to humanized words for segments missing from the catalog", () => {
    expect(capabilityKeyLabel("custom_family__c.some_leaf__c", en)).toBe("Custom Family · Some Leaf");
  });
});
