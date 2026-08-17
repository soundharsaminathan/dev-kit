import { describe, expect, it } from "vitest";
import {
  getHeaderNavLinks,
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
    expect(labels).toContain("Bookings");
    expect(labels).toContain("Payouts");
    expect(labels).not.toContain("Trial caller");
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
      expect(labels).toContain("Trial caller");
      expect(labels).toContain("Settings");
      expect(labels).toContain("Invoices");
      expect(labels).toContain("Payments");
      expect(labels).toContain("Certificates");
      expect(labels).toContain("Payouts");
    }
  });

  it("keeps trainer primary tabs without admin destinations", () => {
    const primary = getPrimaryTabs("app", "TRAINER").map((link) => link.to);
    const more = getMoreLinks("app", "TRAINER").map((link) => link.to);
    expect(primary).toEqual([
      "/app",
      "/app/batches",
      "/app/calendar",
      "/app/profile",
    ]);
    expect(more).toContain("/app/bookings");
    expect(more).toContain("/app/payouts");
    expect(more).not.toContain("/app/leads");
    expect(more).not.toContain("/app/settings");
    expect(more).not.toContain("/app/students");
    expect(more).not.toContain("/app/payments");
  });

  it("puts trial caller on the app bar and bookings in the profile menu", () => {
    const primary = getPrimaryTabs("app", "OWNER");
    const more = getMoreLinks("app", "OWNER").map((link) => link.to);
    expect(primary.map((link) => link.to)).toEqual([
      "/app",
      "/app/batches",
      "/app/leads",
      "/app/calendar",
      "/app/profile",
    ]);
    expect(primary.find((link) => link.to === "/app/leads")?.icon).toBe(
      "phone-call",
    );
    expect(more).toContain("/app/bookings");
    expect(more).not.toContain("/app/leads");
  });

  it("includes Messages and Calendar in the sidebar", () => {
    for (const role of ["OWNER", "STAFF", "TRAINER"] as const) {
      const labels = sidebarLabels(role);
      expect(labels).toContain("Messages");
      expect(labels).toContain("Calendar");
      expect(labels.filter((label) => label === "Calendar")).toHaveLength(1);
    }
  });

  it("keeps Calendar on the mobile toolbar", () => {
    const primary = getPrimaryTabs("app", "OWNER").map((link) => link.to);
    expect(primary).toContain("/app/calendar");
  });

  it("keeps calendar navigation on header for desktop and mobile", () => {
    const desktop = getHeaderNavLinks("app", "OWNER");
    expect(desktop.map((link) => link.to)).toContain("/app/calendar");

    const mobile = getHeaderNavLinks("app", "OWNER", true);
    expect(mobile.map((link) => link.to)).toContain("/app/calendar");
    expect(mobile.find((link) => link.to === "/app/calendar")?.icon).toBe(
      "calendar",
    );
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
