import { expect, test } from "@playwright/test";
import { apiBaseUrl, SEED } from "../fixtures/seed";
import { expectStatus } from "./helpers";

/**
 * Cross-tenant HTTP isolation using distinct users in Studio A vs Studio B.
 * Requires e2e seed (studio-e2e-1 + studio-e2e-2) and AUTH_BYPASS.
 */
test.describe("cross-studio isolation @http", () => {
  test("resolves tenants by slug @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/tenants/resolve?studio=${SEED.studioSlug}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; slug: string };
    expect(body.id).toBe(SEED.studioId);
    expect(body.slug).toBe(SEED.studioSlug);
  });

  test("denies Studio A staff reading Studio B students @http", async () => {
    await expectStatus(
      "STAFF",
      `/users/studio/${SEED.studioBId}/students`,
      403,
    );
  });

  test("denies Studio B staff reading Studio A students @http", async () => {
    await expectStatus(
      "STAFF_B",
      `/users/studio/${SEED.studioId}/students`,
      403,
    );
  });

  test("allows staff to read their own studio students @http", async () => {
    await expectStatus("STAFF", `/users/studio/${SEED.studioId}/students`, 200);
  });

  test("lists both studios in the public directory with slugs @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/studios/directory?includeTest=1`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<{
      id: string;
      slug: string;
      name: string;
    }>;
    const a = body.find((studio) => studio.id === SEED.studioId);
    const b = body.find((studio) => studio.id === SEED.studioBId);
    expect(a?.slug).toBe(SEED.studioSlug);
    expect(b?.slug).toBe(SEED.studioBSlug);
  });
});
