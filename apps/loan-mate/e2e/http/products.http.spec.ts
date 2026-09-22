import { expect, test } from "@playwright/test";
import {
  acme,
  errorMessage,
  expectOk,
  expectStatus,
  patch,
  post,
  uniqueMobile,
  uniquePan,
  uniqueStamp,
} from "./helpers";

test.describe("products @http", () => {
  test("owner configures a product and an officer can only read it @http", async () => {
    const stamp = uniqueStamp();
    const code = `FL${stamp}`.slice(0, 16).toUpperCase();
    const created = await expectOk<{
      id: string;
      code: string;
      active: boolean;
    }>(
      "owner",
      "/products",
      post({
        name: `Flow product ${stamp}`,
        code,
        defaultPrincipal: 50000,
        defaultAnnualRate: 16,
        annualRateWeekly: 14,
        annualRateMonthly: 16,
        defaultTenure: 6,
        defaultFrequency: "MONTHLY",
        processingFeePercent: 1,
      }),
    );
    expect(created.code).toBe(code);
    expect(created.active).toBe(true);

    const listed = await expectOk<Array<{ id: string }>>(
      "officer",
      "/products",
    );
    expect(listed.some((row) => row.id === created.id)).toBeTruthy();
    await expectStatus("collector", "/products", 403);

    await expectStatus(
      "officer",
      "/products",
      403,
      post({
        name: "Denied",
        code: `NO${stamp}`.slice(0, 12),
        defaultPrincipal: 10000,
        defaultAnnualRate: 12,
        defaultTenure: 3,
      }),
    );

    const inactive = await expectOk<{ active: boolean }>(
      "companyAdmin",
      `/products/${created.id}`,
      patch({ active: false, name: `Retired ${stamp}` }),
    );
    expect(inactive.active).toBe(false);

    const catalog = await acme();
    const customer = await expectOk<{ id: string }>(
      "officer",
      "/customers",
      post({
        name: `Product ${stamp}`,
        mobile: uniqueMobile(),
        pan: uniquePan(),
        address: "1 Road",
      }),
    );
    const denied = await expectStatus(
      "officer",
      "/loans",
      404,
      post({
        customerId: customer.id,
        productId: created.id,
        branchId: catalog.branchId,
      }),
    );
    expect(errorMessage(denied.data)).toContain("Product not found");
  });
});
