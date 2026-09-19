import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  normalizeFoundedYear,
  normalizeInstagramUrl,
  normalizeOptionalEmail,
  normalizePhotos,
  normalizeStudioPublicDetails,
  normalizeWebsiteUrl,
  normalizeYoutubeUrl,
} from "./studio-public-fields";

describe("studio public fields", () => {
  it("nullifies blank optional values", () => {
    expect(
      normalizeStudioPublicDetails({
        tagline: "  ",
        about: "",
        email: "  ",
        whatsapp: "",
        instagramUrl: null,
        youtubeUrl: "",
        websiteUrl: " ",
        whatToBring: "",
        trialBlurb: null,
        foundedYear: null,
      }),
    ).toEqual({
      tagline: null,
      about: null,
      email: null,
      whatsapp: null,
      instagramUrl: null,
      youtubeUrl: null,
      websiteUrl: null,
      whatToBring: null,
      trialBlurb: null,
      foundedYear: null,
    });
  });

  it("normalizes contact and social links", () => {
    const currentYear = new Date().getFullYear();
    expect(
      normalizeStudioPublicDetails({
        tagline: "Hip Hop in T Nagar",
        email: "Hello@Studio.IN",
        whatsapp: "+91 98765 43210",
        instagramUrl: "@rhythmhouse",
        youtubeUrl: "youtube.com/watch?v=abcd",
        websiteUrl: "rhythmhouse.in",
        foundedYear: currentYear,
      }),
    ).toEqual({
      tagline: "Hip Hop in T Nagar",
      email: "hello@studio.in",
      whatsapp: "+91 98765 43210",
      instagramUrl: "https://instagram.com/rhythmhouse",
      youtubeUrl: "https://youtube.com/watch?v=abcd",
      websiteUrl: "https://rhythmhouse.in/",
      foundedYear: currentYear,
    });
  });

  it("accepts a full Instagram URL", () => {
    expect(
      normalizeInstagramUrl("https://www.instagram.com/rhythm.house/"),
    ).toBe("https://instagram.com/rhythm.house");
  });

  it("rejects invalid public details", () => {
    expect(() => normalizeOptionalEmail("not-an-email")).toThrow(
      BadRequestException,
    );
    expect(() => normalizeInstagramUrl("https://tiktok.com/x")).toThrow(
      BadRequestException,
    );
    expect(() => normalizeYoutubeUrl("https://vimeo.com/1")).toThrow(
      BadRequestException,
    );
    expect(() => normalizeWebsiteUrl("ftp://files.example")).toThrow(
      BadRequestException,
    );
    expect(() => normalizeFoundedYear(1899)).toThrow(BadRequestException);
    expect(() => normalizeFoundedYear(new Date().getFullYear() + 1)).toThrow(
      BadRequestException,
    );
    expect(() => normalizePhotos(["", "ok"])).toThrow(BadRequestException);
    expect(() =>
      normalizePhotos(Array.from({ length: 13 }, (_, i) => `p${i}`)),
    ).toThrow(BadRequestException);
  });
});
