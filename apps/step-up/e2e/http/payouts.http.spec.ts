import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

type PayoutRow = {
  id: string;
  trainerId: string;
  trainerName: string;
  status: string;
  amount: number | null;
};

test.describe("payouts HTTP @http", () => {
  // Workflow tests mutate payoutTrainer1Id through DRAFT -> SENT -> PAID, so
  // ordering within this file must be preserved.
  test.describe.configure({ mode: "serial" });

  test("owner lists draft payouts with trainer names @http", async () => {
    const list = await expectOk<PayoutRow[]>(
      "OWNER",
      `/payouts/studio/${SEED.studioId}`,
    );

    const ids = list.map((payout) => payout.id);
    expect(ids).toContain(SEED.payoutTrainer1Id);
    expect(ids).toContain(SEED.payoutTrainer2Id);

    const trainer1 = list.find((payout) => payout.id === SEED.payoutTrainer1Id);
    expect(trainer1?.status).toBe("DRAFT");
    expect(trainer1?.amount).toBeNull();
    expect(trainer1?.trainerName).toBe(SEED.users.TRAINER.name);
  });

  test("trainer only sees their own payouts @http", async () => {
    const list = await expectOk<PayoutRow[]>(
      "TRAINER",
      `/payouts/studio/${SEED.studioId}`,
    );

    expect(list.length).toBeGreaterThan(0);
    expect(
      list.every((payout) => payout.trainerId === SEED.users.TRAINER.id),
    ).toBe(true);
    expect(list.some((payout) => payout.id === SEED.payoutTrainer1Id)).toBe(
      true,
    );
    expect(list.some((payout) => payout.id === SEED.payoutTrainer2Id)).toBe(
      false,
    );
  });

  test("payout detail returns linked sessions @http", async () => {
    const detail = await expectOk<{
      id: string;
      trainerId: string;
      sessions: Array<{ id: string; batchName: string }>;
    }>("OWNER", `/payouts/${SEED.payoutTrainer1Id}`);

    expect(detail.id).toBe(SEED.payoutTrainer1Id);
    expect(detail.sessions).toHaveLength(1);
    expect(detail.sessions[0]?.id).toBe(SEED.payoutSessionTrainer1Id);
  });

  test("trainer cannot manage a payout @http", async () => {
    await expectStatus("TRAINER", `/payouts/${SEED.payoutTrainer1Id}`, 403, {
      method: "PATCH",
      body: JSON.stringify({ amount: 100 }),
    });
  });

  test("owner sets an amount and sends the payout @http", async () => {
    const updated = await expectOk<{ amount: number; notes: string }>(
      "OWNER",
      `/payouts/${SEED.payoutTrainer1Id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ amount: 2500, notes: "Reviewed" }),
      },
    );
    expect(updated.amount).toBe(2500);
    expect(updated.notes).toBe("Reviewed");

    const sent = await expectOk<{ status: string; sentAt: string | null }>(
      "OWNER",
      `/payouts/${SEED.payoutTrainer1Id}/send`,
      { method: "PATCH" },
    );
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).toBeTruthy();
  });

  test("sending an already sent payout is rejected @http", async () => {
    await expectStatus("STAFF", `/payouts/${SEED.payoutTrainer1Id}/send`, 400, {
      method: "PATCH",
    });
  });

  test("owner marks a sent payout paid @http", async () => {
    const paid = await expectOk<{ status: string; paidAt: string | null }>(
      "OWNER",
      `/payouts/${SEED.payoutTrainer1Id}/paid`,
      { method: "PATCH" },
    );
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).toBeTruthy();
  });

  test("editing a paid payout is rejected @http", async () => {
    await expectStatus("OWNER", `/payouts/${SEED.payoutTrainer1Id}`, 400, {
      method: "PATCH",
      body: JSON.stringify({ amount: 3000 }),
    });
  });
});
