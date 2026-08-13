import { describe, expect, it } from "vitest";
import { dateInputToApiValue } from "./types";

describe("dateInputToApiValue", () => {
  it("passes through date-only input values", () => {
    expect(dateInputToApiValue("2026-08-13")).toBe("2026-08-13");
  });

  it("strips a time suffix so the API does not receive a doubled ISO string", () => {
    expect(dateInputToApiValue("2026-08-13T00:00:00.000Z")).toBe("2026-08-13");
  });

  it("rejects empty or invalid values", () => {
    expect(() => dateInputToApiValue("")).toThrow(/expense date/i);
    expect(() => dateInputToApiValue("not-a-date")).toThrow(/expense date/i);
  });
});
