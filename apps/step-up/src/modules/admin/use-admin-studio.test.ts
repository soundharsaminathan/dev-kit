import { describe, expect, it } from "vitest";
import { adminStudioDestination } from "./use-admin-studio";

describe("adminStudioDestination", () => {
  it("stays on features when switching studios", () => {
    expect(
      adminStudioDestination("/admin/studios/studio-a/features", "studio-b"),
    ).toEqual({
      to: "/admin/studios/$id/features",
      params: { id: "studio-b" },
    });
  });

  it("stays on invoices when switching studios", () => {
    expect(
      adminStudioDestination("/admin/studios/studio-a/invoices", "studio-b"),
    ).toEqual({
      to: "/admin/studios/$id/invoices",
      params: { id: "studio-b" },
    });
  });

  it("stays on edit when switching studios", () => {
    expect(
      adminStudioDestination("/admin/studios/studio-a", "studio-b"),
    ).toEqual({
      to: "/admin/studios/$id",
      params: { id: "studio-b" },
    });
  });

  it("opens edit from the directory, create, or profile", () => {
    for (const pathname of [
      "/admin",
      "/admin/",
      "/admin/studios/new",
      "/admin/profile",
    ]) {
      expect(adminStudioDestination(pathname, "studio-b")).toEqual({
        to: "/admin/studios/$id",
        params: { id: "studio-b" },
      });
    }
  });
});
