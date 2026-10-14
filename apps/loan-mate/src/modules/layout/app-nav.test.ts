import { describe, expect, it } from "vitest";
import { STAFF_ROLES, type UserRole } from "@/lib/constants";
import { visibleAppNav } from "./app-nav";

function labels(role: UserRole) {
  return visibleAppNav(role).map((item) => item.label);
}

describe("visibleAppNav", () => {
  it("shows every destination to the company owner and admin", () => {
    for (const role of ["COMPANY_OWNER", "COMPANY_ADMIN"] as const) {
      expect(labels(role)).toEqual([
        "Home",
        "Customers",
        "Products",
        "Loans",
        "Approvals",
        "Collections",
        "Employees",
        "Branches",
        "Audit",
        "Reports",
        "Notifications",
        "Settings",
        "Profile",
      ]);
    }
  });

  it("hides approvals and settings from a branch manager", () => {
    const items = labels("BRANCH_MANAGER");
    expect(items).toContain("Products");
    expect(items).toContain("Collections");
    expect(items).toContain("Audit");
    expect(items).not.toContain("Approvals");
    expect(items).not.toContain("Settings");
  });

  it("hides approvals, collections, audit, and settings from a loan officer", () => {
    const items = labels("LOAN_OFFICER");
    expect(items).toContain("Products");
    expect(items).toContain("Customers");
    expect(items).not.toContain("Approvals");
    expect(items).not.toContain("Collections");
    expect(items).not.toContain("Audit");
    expect(items).not.toContain("Settings");
  });

  it("keeps approvals for an approver and hides collections, audit, and settings", () => {
    const items = labels("APPROVER");
    expect(items).toContain("Approvals");
    expect(items).toContain("Products");
    expect(items).not.toContain("Collections");
    expect(items).not.toContain("Audit");
    expect(items).not.toContain("Settings");
  });

  it("keeps collections for a collection officer and hides products, approvals, audit, and settings", () => {
    const items = labels("COLLECTION_OFFICER");
    expect(items).toContain("Collections");
    expect(items).toContain("Customers");
    expect(items).toContain("Loans");
    expect(items).not.toContain("Products");
    expect(items).not.toContain("Approvals");
    expect(items).not.toContain("Audit");
    expect(items).not.toContain("Settings");
  });

  it("still shows shared pages to every staff role", () => {
    for (const role of STAFF_ROLES) {
      const items = labels(role);
      expect(items).toContain("Home");
      expect(items).toContain("Customers");
      expect(items).toContain("Loans");
      expect(items).toContain("Employees");
      expect(items).toContain("Branches");
      expect(items).toContain("Reports");
      expect(items).toContain("Notifications");
      expect(items).toContain("Profile");
    }
  });
});
