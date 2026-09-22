import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_VALUES,
  foundedYearOptions,
  joinPhone,
  locationLabel,
  nextSocialToAdd,
  splitPhone,
  studioProfileCompletion,
  visibleSocials,
} from "./studio-profile-model";

describe("studio profile model", () => {
  it("splits Indian numbers with a country prefix", () => {
    expect(splitPhone("+91 63746 55394")).toEqual({
      iso: "IN",
      national: "6374655394",
    });
    expect(joinPhone("IN", "6374655394")).toBe("+916374655394");
  });

  it("keeps a local number on India when no prefix is present", () => {
    expect(splitPhone("9876543210")).toEqual({
      iso: "IN",
      national: "9876543210",
    });
  });

  it("prefers a longer dial code over +1", () => {
    expect(splitPhone("+971501234567")).toEqual({
      iso: "AE",
      national: "501234567",
    });
  });

  it("reveals WhatsApp only when it has a value", () => {
    expect(visibleSocials({ whatsapp: "" })).toEqual(["instagram", "youtube"]);
    expect(visibleSocials({ whatsapp: "+919876543210" })).toEqual([
      "instagram",
      "youtube",
      "whatsapp",
    ]);
    expect(nextSocialToAdd(["instagram", "youtube"])).toBe("whatsapp");
    expect(nextSocialToAdd(["instagram", "youtube", "whatsapp"])).toBeNull();
  });

  it("scores completion from required profile pieces", () => {
    const empty = studioProfileCompletion({
      values: EMPTY_PROFILE_VALUES,
      hasLogo: false,
      danceStyleCount: 0,
      galleryCount: 0,
      faqCount: 0,
      testimonialCount: 0,
    });
    expect(empty.percent).toBe(0);

    const partial = studioProfileCompletion({
      values: {
        ...EMPTY_PROFILE_VALUES,
        name: "4D-Flo",
        contact: "+916374655394",
        address: "Chennai, Tamil Nadu",
      },
      hasLogo: false,
      danceStyleCount: 6,
      galleryCount: 0,
      faqCount: 0,
      testimonialCount: 0,
    });
    expect(partial.percent).toBe(50);
    expect(
      partial.items.filter((item) => item.done).map((item) => item.id),
    ).toEqual(["basic", "contact", "address", "styles"]);
  });

  it("builds a descending year list from 1950", () => {
    const years = foundedYearOptions(new Date("2026-09-20"));
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(1950);
  });

  it("shortens a full address to city and region", () => {
    expect(locationLabel("12 Anna Salai, Chennai, Tamil Nadu")).toBe(
      "Chennai, Tamil Nadu",
    );
    expect(locationLabel("Chennai")).toBe("Chennai");
  });
});
