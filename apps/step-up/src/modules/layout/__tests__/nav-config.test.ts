import { describe, expect, it } from "vitest";
import {
  getMoreLinks,
  getPrimaryTabs,
  getSidebarSections,
} from "@/modules/layout/nav-config";

function sidebarLabels(role: "OWNER" | "STAFF" | "TRAINER") {
  return getSidebarSections("app", role).flatMap((section) =>
    section.links.map((link) => link.label),
  );
}

describe("app nav role filtering", () => {
  it("hides studio-admin links from trainers", () => {
    const labels = sidebarLabels("TRAINER");
    expect(labels).toContain("Batches");
    expect(labels).toContain("Retention");
    expect(labels).not.toContain("Payments");
    expect(labels).not.toContain("Students");
    expect(labels).not.toContain("Subscriptions");
    expect(labels).not.toContain("Certificates");
    expect(labels).not.toContain("Invoices");
    expect(labels).not.toContain("Settings");
  });

  it("keeps studio-admin links for owner and staff", () => {
    for (const role of ["OWNER", "STAFF"] as const) {
      const labels = sidebarLabels(role);
      expect(labels).toContain("Students");
      expect(labels).toContain("Settings");
      expect(labels).toContain("Invoices");
      expect(labels).toContain("Payments");
      expect(labels).toContain("Certificates");
    }
  });

  it("keeps trainer primary tabs without admin destinations", () => {
    const primary = getPrimaryTabs("app", "TRAINER").map((link) => link.to);
    const more = getMoreLinks("app", "TRAINER").map((link) => link.to);
    expect(primary).toEqual([
      "/app",
      "/app/batches",
      "/app/bookings",
      "/app/messages",
      "/app/profile",
    ]);
    expect(more).not.toContain("/app/settings");
    expect(more).not.toContain("/app/students");
    expect(more).not.toContain("/app/payments");
  });
});

describe("member nav", () => {
  it("keeps trainers out of primary tabs", () => {
    const primary = getPrimaryTabs("me").map((link) => link.to);
    const more = getMoreLinks("me").map((link) => link.to);
    expect(primary).toEqual(["/me", "/me/book", "/me/messages", "/me/profile"]);
    expect(more).toContain("/me/trainers");
  });
});
