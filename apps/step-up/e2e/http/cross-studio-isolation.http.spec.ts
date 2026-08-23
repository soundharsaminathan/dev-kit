import { describe, expect, it } from "vitest";
import { apiBaseUrl, bearerFor, SEED } from "../fixtures/seed";

/**
 * Cross-tenant HTTP isolation using distinct users in Studio A vs Studio B.
 * Requires e2e seed (studio-e2e-1 + studio-e2e-2) and AUTH_BYPASS.
 */
describe("cross-studio isolation @http", () => {
  const base = apiBaseUrl();

  async function api(
    path: string,
    role: keyof typeof SEED.users,
    init?: RequestInit,
  ) {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${bearerFor(role)}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    return response;
  }

  it("resolves tenants by slug", async () => {
    const response = await fetch(
      `${base}/tenants/resolve?studio=${SEED.studioSlug}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; slug: string };
    expect(body.id).toBe(SEED.studioId);
    expect(body.slug).toBe(SEED.studioSlug);
  });

  it("denies Studio A staff reading Studio B students", async () => {
    const response = await api(
      `/users/studio/${SEED.studioBId}/students`,
      "STAFF",
    );
    expect(response.status).toBe(403);
  });

  it("denies Studio B staff reading Studio A students", async () => {
    const response = await api(
      `/users/studio/${SEED.studioId}/students`,
      "STAFF_B",
    );
    expect(response.status).toBe(403);
  });

  it("allows staff to read their own studio students", async () => {
    const response = await api(
      `/users/studio/${SEED.studioId}/students`,
      "STAFF",
    );
    expect(response.status).toBe(200);
  });

  it("lists both studios in the public directory with slugs", async () => {
    const response = await fetch(`${base}/studios/directory`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<{
      id: string;
      slug: string;
      name: string;
    }>;
    const a = body.find((s) => s.id === SEED.studioId);
    const b = body.find((s) => s.id === SEED.studioBId);
    expect(a?.slug).toBe(SEED.studioSlug);
    expect(b?.slug).toBe(SEED.studioBSlug);
  });
});
