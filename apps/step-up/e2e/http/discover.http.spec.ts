import { expect, test } from "@playwright/test";
import { apiBaseUrl, SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

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

  test("guest landing payload is city scoped @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/discover/landing?city=chennai`,
    );
    expect(response.ok).toBeTruthy();
    const data = (await response.json()) as {
      city: { id: string; available: boolean };
      cities: Array<{ id: string; available: boolean }>;
      styles: unknown[];
      areas: unknown[];
      studios: unknown[];
    };
    expect(data.city.id).toBe("chennai");
    expect(data.city.available).toBe(true);
    expect(
      data.cities.some((city) => city.id === "bengaluru" && !city.available),
    ).toBe(true);
    expect(Array.isArray(data.styles)).toBe(true);
    expect(Array.isArray(data.areas)).toBe(true);
    expect(Array.isArray(data.studios)).toBe(true);
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

  test("public trial slots 404 for missing or test studios @http", async () => {
    const missing = await fetch(
      `${apiBaseUrl()}/discover/studios/does-not-exist-xyz/trial-slots`,
    );
    expect(missing.status).toBe(404);

    const seeded = await fetch(
      `${apiBaseUrl()}/discover/studios/${SEED.studioSlug}/trial-slots`,
    );
    expect(seeded.status).toBe(404);
  });

  test("seeded test studios are excluded from public discover @http", async () => {
    const response = await fetch(`${apiBaseUrl()}/discover/studios?limit=48`);
    expect(response.ok).toBeTruthy();
    const data = (await response.json()) as Array<{ slug: string }>;
    expect(data.some((studio) => studio.slug === SEED.studioSlug)).toBe(false);
  });

  test("marketplace catalog endpoints return the envelope @http", async () => {
    const [classes, trainers, studios] = await Promise.all([
      fetch(`${apiBaseUrl()}/discover/classes?category=DANCE&city=chennai`),
      fetch(`${apiBaseUrl()}/discover/trainers?category=DANCE&city=chennai`),
      fetch(
        `${apiBaseUrl()}/discover/studios?category=DANCE&sort=availability`,
      ),
    ]);
    expect(classes.ok).toBeTruthy();
    expect(trainers.ok).toBeTruthy();
    expect(studios.ok).toBeTruthy();

    const classPage = (await classes.json()) as {
      tab: string;
      category: string;
      city: string;
      sort: string;
      empty: { kind: string | null; message: string | null };
      items: Array<{
        canTrial?: boolean;
        seatLabel?: string | null;
        viewerEnrolled?: boolean | null;
      }>;
    };
    expect(classPage.tab).toBe("classes");
    expect(classPage.category).toBe("DANCE");
    expect(classPage.city).toBe("chennai");
    expect(classPage.sort).toBe("availability");
    expect(classPage.empty).toEqual(
      expect.objectContaining({
        kind: expect.anything(),
        message: expect.anything(),
      }),
    );
    expect(Array.isArray(classPage.items)).toBe(true);
    for (const item of classPage.items) {
      expect(item.viewerEnrolled).toBeNull();
      expect(typeof item.canTrial).toBe("boolean");
    }

    const trainerPage = (await trainers.json()) as {
      tab: string;
      items: unknown[];
    };
    expect(trainerPage.tab).toBe("trainers");
    expect(Array.isArray(trainerPage.items)).toBe(true);

    const studioPage = (await studios.json()) as {
      tab: string;
      items: unknown[];
    };
    expect(studioPage.tab).toBe("studios");
    expect(Array.isArray(studioPage.items)).toBe(true);
  });

  test("legacy lowercase category still returns a studio array @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/discover/studios?category=dance`,
    );
    expect(response.ok).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("marketplace class detail 404s missing slugs @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/discover/classes/does-not-exist-xyz`,
    );
    expect(response.status).toBe(404);
    const trainer = await fetch(
      `${apiBaseUrl()}/discover/trainers/does-not-exist-xyz`,
    );
    expect(trainer.status).toBe(404);
  });

  test("guest cannot write marketplace ratings @http", async () => {
    const response = await fetch(`${apiBaseUrl()}/discover/ratings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: "anon",
        target: "STUDIO",
        studioId: SEED.users.STUDENT.studioId,
        category: "DANCE",
        rating: 5,
      }),
    });
    expect(response.status).toBe(401);
  });

  test("student cannot rate a studio they never attended @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Never Attended Rater", cleanup);
      await expectStatus(
        "STUDENT",
        "/discover/ratings",
        400,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            target: "STUDIO",
            studioId: SEED.users.STUDENT.studioId,
            category: "DANCE",
            rating: 5,
          }),
        },
        { userId: student.id },
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("zero-result marketplace search returns empty copy @http", async () => {
    const response = await fetch(
      `${apiBaseUrl()}/discover/classes?category=DANCE&city=chennai&q=zzzznotaclass`,
    );
    expect(response.ok).toBeTruthy();
    const page = (await response.json()) as {
      items: unknown[];
      empty: { kind: string | null; message: string | null };
    };
    expect(page.items).toEqual([]);
    expect(page.empty.kind).toBe("filters");
    expect(page.empty.message).toContain("filters");
  });
});
