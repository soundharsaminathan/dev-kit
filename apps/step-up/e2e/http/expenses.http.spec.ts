import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus, httpJson } from "./helpers";

const STUDIO_ID = SEED.studioId;

type ExpenseCategory = { id: string; name: string; isDefault: boolean };
type Expense = { id: string; expenseDate: string; amount: number };

test.describe("expenses HTTP @http", () => {
  test("records an expense when the date is an ISO datetime @http", async () => {
    const categories = await expectOk<ExpenseCategory[]>(
      "STAFF",
      `/expense-categories/studio/${STUDIO_ID}`,
    );
    const category =
      categories.find((item) => item.name === "Rent") ?? categories[0];
    expect(category).toBeTruthy();

    const created = await expectOk<Expense>("STAFF", "/expenses", {
      method: "POST",
      body: JSON.stringify({
        studioId: STUDIO_ID,
        amount: 150,
        expenseDate: "2026-08-13T00:00:00.000Z",
        categoryId: category!.id,
        vendor: "ISO date vendor",
      }),
    });

    try {
      expect(Number(created.amount)).toBe(150);
      expect(new Date(created.expenseDate).toISOString().slice(0, 10)).toBe(
        "2026-08-13",
      );
    } finally {
      await httpJson("STAFF", `/expenses/${created.id}`, { method: "DELETE" });
    }
  });

  test("rejects an invalid expense date @http", async () => {
    const categories = await expectOk<ExpenseCategory[]>(
      "STAFF",
      `/expense-categories/studio/${STUDIO_ID}`,
    );
    const category = categories[0];
    expect(category).toBeTruthy();

    const result = await expectStatus("STAFF", "/expenses", 400, {
      method: "POST",
      body: JSON.stringify({
        studioId: STUDIO_ID,
        amount: 150,
        expenseDate: "not-a-date",
        categoryId: category!.id,
      }),
    });
    expect(result.text).toMatch(/date/i);
  });

  test("editing a category patches it instead of creating another @http", async () => {
    const stamp = Date.now();
    const originalName = `HTTP Props ${stamp}`;
    const renamed = `HTTP Stage props ${stamp}`;

    const created = await expectOk<ExpenseCategory>(
      "STAFF",
      "/expense-categories",
      {
        method: "POST",
        body: JSON.stringify({
          studioId: STUDIO_ID,
          name: originalName,
        }),
      },
    );

    try {
      const before = await expectOk<ExpenseCategory[]>(
        "STAFF",
        `/expense-categories/studio/${STUDIO_ID}`,
      );

      const updated = await expectOk<ExpenseCategory>(
        "STAFF",
        `/expense-categories/${created.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: renamed }),
        },
      );
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(renamed);

      const after = await expectOk<ExpenseCategory[]>(
        "STAFF",
        `/expense-categories/studio/${STUDIO_ID}`,
      );
      expect(after).toHaveLength(before.length);
      expect(after.filter((item) => item.id === created.id)).toHaveLength(1);
      expect(after.some((item) => item.name === originalName)).toBe(false);
      expect(after.some((item) => item.name === renamed)).toBe(true);
    } finally {
      await httpJson("STAFF", `/expense-categories/${created.id}`, {
        method: "DELETE",
      });
    }
  });

  test("trainer cannot create expenses or categories @http", async () => {
    await expectStatus("TRAINER", "/expenses", 403, {
      method: "POST",
      body: JSON.stringify({
        studioId: STUDIO_ID,
        amount: 10,
        expenseDate: "2026-08-13",
        categoryId: "cat-missing",
      }),
    });
    await expectStatus("TRAINER", "/expense-categories", 403, {
      method: "POST",
      body: JSON.stringify({
        studioId: STUDIO_ID,
        name: "Should not exist",
      }),
    });
  });
});
