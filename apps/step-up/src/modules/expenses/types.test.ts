import { describe, expect, it } from "vitest";
import { dateInputToApiValue, validateExpenseDraft } from "./types";

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

describe("validateExpenseDraft", () => {
  const valid = {
    amount: "250",
    expenseDate: "2026-08-13",
    categoryId: "cat-rent",
  };

  it("rejects a missing category", () => {
    expect(validateExpenseDraft({ ...valid, categoryId: "" })).toBe(
      "Choose a category.",
    );
  });

  it("rejects a zero or empty amount", () => {
    expect(validateExpenseDraft({ ...valid, amount: "0" })).toBe(
      "Enter an amount greater than zero.",
    );
    expect(validateExpenseDraft({ ...valid, amount: "" })).toBe(
      "Enter an amount greater than zero.",
    );
  });

  it("rejects a missing date", () => {
    expect(validateExpenseDraft({ ...valid, expenseDate: "" })).toBe(
      "Choose an expense date.",
    );
  });

  it("accepts a complete draft", () => {
    expect(validateExpenseDraft(valid)).toBeNull();
  });
});
