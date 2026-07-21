import { describe, expect, it } from "vitest";
import { ENTITY_ICONS, entityIcon } from "@/lib/entity-icons";

describe("entity icons", () => {
  it("keeps student, trainer, and batch icons distinct", () => {
    const icons = [
      ENTITY_ICONS.student,
      ENTITY_ICONS.trainer,
      ENTITY_ICONS.batch,
    ];
    expect(new Set(icons).size).toBe(3);
  });

  it("resolves entity icons by kind", () => {
    expect(entityIcon("student")).toBe("users");
    expect(entityIcon("trainer")).toBe("circle-user");
    expect(entityIcon("batch")).toBe("layout-grid");
  });
});
