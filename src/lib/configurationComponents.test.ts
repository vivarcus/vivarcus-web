import { afterEach, describe, expect, it } from "vitest";
import type { NavigationModel } from "../api/types";
import {
  matchConfigurationComponent,
  readFavoriteComponentKeys,
  readRecentComponentKeys,
  recordConfigurationRecent,
  toggleConfigurationFavorite,
  visibleConfigurationComponents,
} from "./configurationComponents";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const nav: NavigationModel = {
  model_type: "navigation",
  vault_id: "vault-1",
  display_context: { language: "en", locale: "en-US", timezone: "UTC" },
  chrome: {} as NavigationModel["chrome"],
  ui_fingerprint: "fp",
  collections: [
    {
      api_name: "admin_tabs__v",
      label: label("Admin"),
      system_kind: "admin",
      items: [
        {
          item_type: "tab",
          label: label("Configuration"),
          tab: {
            api_name: "platform_admin_configuration__v",
            label: label("Configuration"),
            kind: "platform",
            route: "/admin/configuration",
            subtabs: [
              {
                api_name: "platform_admin_configuration_objects__v",
                label: label("Objects"),
                kind: "platform",
                route: "/admin/configuration/objects",
              },
              {
                api_name: "platform_admin_configuration_object_lifecycles__v",
                label: label("Object Lifecycles"),
                kind: "platform",
                route: "/admin/configuration/object-lifecycles",
              },
              {
                api_name: "platform_admin_configuration_workflows__v",
                label: label("Workflows"),
                kind: "platform",
                route: "/admin/configuration/workflows",
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("configurationComponents", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("filters hub components by navigation subtabs", () => {
    const visible = visibleConfigurationComponents(nav);
    expect(visible.map((c) => c.key)).toEqual(["objects", "object-lifecycles", "workflows"]);
  });

  it("matches the deepest component route for detail pages", () => {
    const visible = visibleConfigurationComponents(nav);
    expect(matchConfigurationComponent("/admin/configuration/objects/study__v", visible)?.key).toBe(
      "objects",
    );
    expect(
      matchConfigurationComponent("/admin/configuration/object-lifecycles/foo__v", visible)?.key,
    ).toBe("object-lifecycles");
    expect(
      matchConfigurationComponent("/admin/configuration/workflows/approve__v", visible)?.key,
    ).toBe("workflows");
  });

  it("records recently used and toggles favorites in localStorage", () => {
    expect(recordConfigurationRecent("v1", "objects")).toEqual(["objects"]);
    expect(recordConfigurationRecent("v1", "layouts")).toEqual(["layouts", "objects"]);
    expect(readRecentComponentKeys("v1")).toEqual(["layouts", "objects"]);

    expect(toggleConfigurationFavorite("v1", "objects")).toEqual(["objects"]);
    expect(toggleConfigurationFavorite("v1", "objects")).toEqual([]);
    expect(readFavoriteComponentKeys("v1")).toEqual([]);
  });
});
