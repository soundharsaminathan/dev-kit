import { describe, expect, it } from "vitest";
import { filterSettingsNav, SETTINGS_NAV } from "./settings-nav";

describe("settings-nav integrations", () => {
  it("hides integrations from staff", () => {
    const groups = filterSettingsNav(SETTINGS_NAV, {
      isOwner: false,
      isAdmin: true,
      isFeatureEnabled: () => true,
    });
    const items = groups.flatMap((g) => g.items);
    expect(items.some((item) => item.id === "integrations")).toBe(false);
  });

  it("hides integrations when ai_agent is disabled", () => {
    const groups = filterSettingsNav(SETTINGS_NAV, {
      isOwner: true,
      isAdmin: true,
      isFeatureEnabled: (key) => key !== "ai_agent",
    });
    const items = groups.flatMap((g) => g.items);
    expect(items.some((item) => item.id === "integrations")).toBe(false);
  });

  it("shows integrations for owners when ai_agent is enabled", () => {
    const groups = filterSettingsNav(SETTINGS_NAV, {
      isOwner: true,
      isAdmin: true,
      isFeatureEnabled: () => true,
    });
    const integrations = groups
      .flatMap((g) => g.items)
      .find((item) => item.id === "integrations");
    expect(integrations).toMatchObject({
      kind: "internal",
      ownerOnly: true,
      feature: "ai_agent",
    });
  });
});
