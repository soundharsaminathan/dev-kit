import { expect, test } from "@playwright/test";
import { activateLoan } from "./flows";
import {
  errorMessage,
  expectOk,
  expectStatus,
  post,
  processOutbox,
} from "./helpers";

test.describe("notifications @http", () => {
  test("disbursement and approval events land in the staff inbox @http", async () => {
    test.setTimeout(120_000);
    const { loan } = await activateLoan();
    await processOutbox();

    const inbox = await expectOk<
      Array<{ id: string; title: string; body: string; readAt: string | null }>
    >("owner", "/notifications");
    const disbursed = inbox.find(
      (row) =>
        row.title === "Loan disbursed" && row.body.includes(loan.loanNumber),
    );
    expect(disbursed).toBeTruthy();

    const pending = inbox.find((row) => row.title === "Approval pending");
    expect(pending).toBeTruthy();

    const read = await expectOk<{ updated: boolean }>(
      "owner",
      `/notifications/${disbursed!.id}/read`,
      post({}),
    );
    expect(read.updated).toBe(true);

    const stranger = await expectOk<{ updated: boolean }>(
      "owner",
      "/notifications/does-not-exist/read",
      post({}),
    );
    expect(stranger.updated).toBe(false);

    await expectOk("owner", "/notifications/read-all", post({}));
    const after = await expectOk<Array<{ readAt: string | null }>>(
      "owner",
      "/notifications",
    );
    expect(after.every((row) => row.readAt)).toBeTruthy();

    const admin = await expectStatus("admin", "/notifications", 400);
    expect(errorMessage(admin.data)).toContain("companyId");
  });
});
