import { describe, expect, it } from "vitest";
import {
  availableShareFields,
  buildBatchShareCardData,
  defaultFieldVisibility,
} from "./map-batch-share-data";
import type { BatchShareSource, StudioShareSource } from "./types";

const studio: StudioShareSource = {
  name: "Rhythm Studio",
  logoUrl: "https://cdn.example/logo.png",
  settings: {
    danceStyles: [
      {
        id: "hip-hop",
        label: "Hip Hop",
        color: "#E4572E",
        abbrev: "HH",
        emoji: "💃",
      },
    ],
  },
};

const fullBatch: BatchShareSource = {
  name: "Evening Hip Hop Advanced",
  coverImageUrl: "https://cdn.example/cover.jpg",
  category: "ADULTS",
  styleBadge: "Hip Hop",
  danceCategories: [{ name: "Hip Hop" }],
  scheduleLabel: "Mon · Wed · Fri · 6:00–7:00 PM",
  trainers: [
    { trainer: { name: "Asha Verma" } },
    { trainer: { name: "Rohan Das" } },
    { trainer: { name: "Extra Trainer" } },
  ],
  branch: {
    name: "Indiranagar",
    address: "12 Main Road",
  },
};

describe("buildBatchShareCardData", () => {
  it("maps populated batch and studio fields", () => {
    const data = buildBatchShareCardData(fullBatch, studio);
    expect(data.batchName).toBe("Evening Hip Hop Advanced");
    expect(data.coverImageUrl).toBe("https://cdn.example/cover.jpg");
    expect(data.danceStyle).toBe("Hip Hop");
    expect(data.trainerName).toBe("Asha Verma · Rohan Das");
    expect(data.schedule).toBe("Mon · Wed · Fri · 6:00–7:00 PM");
    expect(data.ageGroup).toBe("Adults");
    expect(data.location).toBe("Indiranagar");
    expect(data.studioName).toBe("Rhythm Studio");
    expect(data.studioLogoUrl).toBe("https://cdn.example/logo.png");
    expect(data.studioPrimaryColor).toBe("#E4572E");
    expect(data.headline).toBe("New Batch Starting!");
    expect(data.cta).toBe("Join This Batch");
    expect(data).not.toHaveProperty("level");
  });

  it("maps kids category and omits missing optional fields", () => {
    const data = buildBatchShareCardData(
      {
        name: "Tiny Tots",
        category: "KIDS",
        trainers: [],
        branch: null,
        scheduleLabel: null,
        coverImageUrl: null,
        danceCategories: [],
      },
      { name: "Studio" },
    );
    expect(data.ageGroup).toBe("Kids");
    expect(data.coverImageUrl).toBeUndefined();
    expect(data.danceStyle).toBeUndefined();
    expect(data.trainerName).toBeUndefined();
    expect(data.schedule).toBeUndefined();
    expect(data.location).toBeUndefined();
    expect(data.studioLogoUrl).toBeUndefined();
  });

  it("uses danceCategories when styleBadge is missing", () => {
    const data = buildBatchShareCardData(
      {
        name: "Jazz Foundations",
        danceCategories: [{ name: "Jazz" }],
      },
      studio,
    );
    expect(data.danceStyle).toBe("Jazz");
  });

  it("uses branch address when name is missing", () => {
    const data = buildBatchShareCardData(
      {
        name: "Batch",
        branch: { address: "42 Lake Road" },
      },
      studio,
    );
    expect(data.location).toBe("42 Lake Road");
  });

  it("applies headline, cta, and field visibility options", () => {
    const data = buildBatchShareCardData(fullBatch, studio, {
      headline: "Admissions Open",
      cta: "Book a Trial",
      layout: "heroBand",
      fields: {
        danceStyle: true,
        trainerName: false,
        schedule: true,
        ageGroup: false,
        location: false,
      },
    });
    expect(data.headline).toBe("Admissions Open");
    expect(data.cta).toBe("Book a Trial");
    expect(data.danceStyle).toBe("Hip Hop");
    expect(data.schedule).toBe("Mon · Wed · Fri · 6:00–7:00 PM");
    expect(data.trainerName).toBeUndefined();
    expect(data.ageGroup).toBeUndefined();
    expect(data.location).toBeUndefined();
    expect(data.coverImageUrl).toBe("https://cdn.example/cover.jpg");
  });

  it("handles very long names without inventing fields", () => {
    const longName =
      "Contemporary Fusion Intensive Weekend Masterclass Series for Intermediate Dancers";
    const data = buildBatchShareCardData(
      {
        name: longName,
        trainers: [
          {
            trainer: {
              name: "Professor Alexandrina Constantine-Williams",
            },
          },
        ],
        branch: {
          name: "Bengaluru Koramangala Prestige Shantiniketan Extension Studio",
        },
      },
      { name: "The Very Long Named Dance Academy of South India" },
    );
    expect(data.batchName).toBe(longName);
    expect(data.trainerName).toContain("Alexandrina");
    expect(data.location).toContain("Koramangala");
  });
});

describe("availableShareFields / defaultFieldVisibility", () => {
  it("only lists fields that have data", () => {
    const data = buildBatchShareCardData(
      {
        name: "Batch",
        styleBadge: "Ballet",
        scheduleLabel: "Tue 5 PM",
      },
      studio,
    );
    expect(availableShareFields(data)).toEqual(["danceStyle", "schedule"]);
    expect(defaultFieldVisibility(data)).toEqual({
      danceStyle: true,
      schedule: true,
    });
  });
});
