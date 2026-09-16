import { expect, test } from "@playwright/test";
import { apiBaseUrl, SEED } from "../fixtures/seed";

test.describe("discover HTTP @http", () => {
  test("guest can list studios without auth @http", async () => {
    const response = await fetch(`${apiBaseUrl()}/discover/studios`);
    expect(response.ok).toBeTruthy();
    const data = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    for (const studio of data) {
      expect(studio).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          slug: expect.any(String),
          name: expect.any(String),
          styles: expect.any(Array),
          categories: expect.any(Array),
          batchCount: expect.any(Number),
          ratingCount: expect.any(Number),
        }),
      );
      expect(studio).not.toHaveProperty("contact");
      expect(studio).not.toHaveProperty("owner");
      expect(studio).not.toHaveProperty("email");
      expect(JSON.stringify(studio)).not.toMatch(/pii|razorpay|password/i);
      if (studio.ratingCount === 0) {
        expect(studio.ratingAvg).toBeNull();
      }
    }
  });

  test("guest cities categories and stats @http", async () => {
    const [cities, categories, stats] = await Promise.all([
      fetch(`${apiBaseUrl()}/discover/cities`),
      fetch(`${apiBaseUrl()}/discover/categories`),
      fetch(`${apiBaseUrl()}/discover/stats`),
    ]);
    expect(cities.ok).toBeTruthy();
    expect(categories.ok).toBeTruthy();
    expect(stats.ok).toBeTruthy();

    const cityData = (await cities.json()) as Array<{
      id: string;
      label: string;
      studioCount: number;
    }>;
    expect(cityData.some((city) => city.id === "chennai")).toBe(true);

    const categoryData = (await categories.json()) as Array<{
      id: string;
      studioCount: number;
    }>;
    expect(categoryData.some((category) => category.id === "dance")).toBe(true);

    const statsData = (await stats.json()) as {
      studios: number;
      classes: number;
      learners: number;
    };
    expect(statsData.studios).toBeGreaterThanOrEqual(0);
    expect(statsData.classes).toBeGreaterThanOrEqual(0);
    expect(statsData.learners).toBeGreaterThanOrEqual(0);
  });

  test("unknown city and empty category return empty lists @http", async () => {
    const emptyCity = await fetch(
      `${apiBaseUrl()}/discover/studios?city=atlantis`,
    );
    expect(emptyCity.ok).toBeTruthy();
    expect(await emptyCity.json()).toEqual([]);

    const music = await fetch(
      `${apiBaseUrl()}/discover/studios?category=music`,
    );
    expect(music.ok).toBeTruthy();
    expect(Array.isArray(await music.json())).toBe(true);
  });

  test("studio detail 404 for missing id @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/discover/studios/does-not-exist-xyz`,
    );
    expect(response.status).toBe(404);
  });

  test("seeded test studios are excluded from public discover @http", async () => {
    const response = await fetch(`${apiBaseUrl()}/discover/studios?limit=48`);
    expect(response.ok).toBeTruthy();
    const data = (await response.json()) as Array<{ slug: string }>;
    expect(data.some((studio) => studio.slug === SEED.studioSlug)).toBe(false);
  });
});
