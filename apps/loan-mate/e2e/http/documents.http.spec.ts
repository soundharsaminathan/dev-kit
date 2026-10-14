import { expect, test } from "@playwright/test";
import {
  createCustomer,
  expectOk,
  expectStatus,
  post,
  uniqueStamp,
} from "./helpers";

test.describe("documents @http", () => {
  test("staff stores a KYC file and a loan officer cannot delete it @http", async () => {
    const customer = await createCustomer({ kyc: false });
    const stamp = uniqueStamp();
    const signed = await expectOk<{
      uploadUrl: string;
      key: string;
      provider: string;
    }>(
      "officer",
      "/documents/signed-url",
      post({ fileName: `pan-${stamp}.pdf`, contentType: "application/pdf" }),
    );
    expect(signed.uploadUrl).toBeTruthy();
    expect(signed.key).toContain("pan-");

    const created = await expectOk<{ id: string; kind: string }>(
      "officer",
      "/documents",
      post({
        entityType: "CUSTOMER",
        entityId: customer.id,
        kind: "KYC_ADDRESS",
        objectKey: signed.key,
        fileName: `address-${stamp}.pdf`,
        contentType: "application/pdf",
        sizeBytes: 1200,
      }),
    );
    expect(created.kind).toBe("KYC_ADDRESS");

    const listed = await expectOk<Array<{ id: string; readUrl: string }>>(
      "approver",
      `/documents?entityType=CUSTOMER&entityId=${customer.id}`,
    );
    expect(listed.some((row) => row.id === created.id)).toBeTruthy();
    expect(listed.find((row) => row.id === created.id)?.readUrl).toBeTruthy();

    await expectStatus("officer", `/documents/${created.id}`, 403, {
      method: "DELETE",
    });
    await expectStatus(
      "admin",
      "/documents/signed-url",
      403,
      post({
        fileName: "x.pdf",
        contentType: "application/pdf",
      }),
    );

    const removed = await expectOk<{ deleted: boolean }>(
      "manager",
      `/documents/${created.id}`,
      { method: "DELETE" },
    );
    expect(removed.deleted).toBe(true);

    const after = await expectOk<Array<{ id: string }>>(
      "officer",
      `/documents?entityType=CUSTOMER&entityId=${customer.id}`,
    );
    expect(after.some((row) => row.id === created.id)).toBeFalsy();
  });
});
