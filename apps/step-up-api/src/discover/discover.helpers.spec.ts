import { describe, expect, it } from "vitest";
import { isTestStudio } from "../studios/test-studio";
import {
  categoriesFromStyles,
  categorizeStyleName,
  isValidCategoryId,
  stylesFromDanceCategories,
} from "./discover.categories";
import { matchCityFromAddress } from "./discover.cities";
import {
  haversineKm,
  nearestDistanceKm,
  roundDistanceKm,
} from "./discover.geo";
import {
  batchTimingLabel,
  dayBandsFromSchedule,
  timeBandsFromSchedule,
} from "./discover.schedule";

describe("discover.cities", () => {
  it("matches city aliases from address text", () => {
    expect(matchCityFromAddress("12 Anna Nagar, Chennai 600040")?.id).toBe(
      "chennai",
    );
    expect(matchCityFromAddress("Koramangala, Bangalore")?.id).toBe(
      "bengaluru",
    );
    expect(matchCityFromAddress("Near Kovai")?.id).toBe("coimbatore");
    expect(matchCityFromAddress("New Delhi 110001")?.id).toBe("delhi");
  });

  it("returns null for unmatched addresses instead of guessing", () => {
    expect(matchCityFromAddress("Somewhere in Tamil Nadu")).toBeNull();
    expect(matchCityFromAddress(null, undefined, "")).toBeNull();
  });
});

describe("discover.categories", () => {
  it("maps style names into activity buckets", () => {
    expect(categorizeStyleName("Bharatanatyam")).toBe("dance");
    expect(categorizeStyleName("Carnatic vocals")).toBe("music");
    expect(categorizeStyleName("Watercolor painting")).toBe("art");
    expect(categorizeStyleName("Hatha Yoga")).toBe("fitness");
    expect(categorizeStyleName("Swimming beginners")).toBe("swimming");
    expect(categorizeStyleName("Karate")).toBe("martial-arts");
    expect(categorizeStyleName("Drama club")).toBe("theatre");
    expect(categorizeStyleName("Mystery hobby")).toBe("other");
  });

  it("extracts styles and defaults empty studios to dance", () => {
    expect(
      stylesFromDanceCategories([
        { name: "Hip Hop" },
        { name: "" },
        { description: "x" },
      ]),
    ).toEqual(["Hip Hop"]);
    expect(categoriesFromStyles([])).toEqual(["dance"]);
    expect(isValidCategoryId("dance")).toBe(true);
    expect(isValidCategoryId("cooking")).toBe(false);
  });
});

describe("discover.geo", () => {
  it("computes haversine distance and nearest branch", () => {
    const km = haversineKm(13.0827, 80.2707, 12.9716, 77.5946);
    expect(km).toBeGreaterThan(280);
    expect(km).toBeLessThan(360);

    expect(
      nearestDistanceKm({ lat: 13.08, lng: 80.27 }, [
        { latitude: null, longitude: null },
        { latitude: 13.09, longitude: 80.28 },
      ]),
    ).toBeGreaterThan(0);

    expect(nearestDistanceKm({ lat: 13, lng: 80 }, [])).toBeNull();
    expect(roundDistanceKm(2.34)).toBe(2.3);
    expect(roundDistanceKm(12.6)).toBe(13);
  });
});

describe("discover.schedule", () => {
  it("derives morning evening and weekday weekend bands", () => {
    expect(
      timeBandsFromSchedule({
        startTime: "09:00",
        endTime: "10:00",
        weekdays: [1, 3, 5],
      }),
    ).toEqual({ morning: true, evening: false });

    expect(
      timeBandsFromSchedule({
        dayTimes: [
          { weekday: 6, startTime: "18:00", endTime: "19:00" },
          { weekday: 1, startTime: "10:00", endTime: "11:00" },
        ],
      }),
    ).toEqual({ morning: true, evening: true });

    expect(
      dayBandsFromSchedule({
        weekdays: [6, 0],
        startTime: "10:00",
        endTime: "11:00",
      }),
    ).toEqual({ weekday: false, weekend: true });

    expect(batchTimingLabel({ morning: true, evening: true })).toBe(
      "Morning and evening batches",
    );
    expect(batchTimingLabel({ morning: false, evening: false })).toBeNull();
  });
});

describe("discover public safety", () => {
  it("excludes test studios by the shared heuristic", () => {
    expect(
      isTestStudio({ slug: "e2e-test-studio", name: "E2E Test Studio" }),
    ).toBe(true);
    expect(isTestStudio({ slug: "rhythm-house", name: "Rhythm House" })).toBe(
      false,
    );
  });
});
