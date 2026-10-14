import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  ImportStudioDataDto,
  normalizeImportDanceStyles,
} from "./import-studio-data.dto";

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

describe("normalizeImportDanceStyles", () => {
  it("joins style arrays into a comma-separated string", () => {
    expect(normalizeImportDanceStyles(["Hip-Hop", "Jazz"])).toBe(
      "Hip-Hop, Jazz",
    );
  });

  it("returns null for empty arrays", () => {
    expect(normalizeImportDanceStyles([])).toBeNull();
  });

  it("decodes HTML entities in style names", () => {
    expect(
      normalizeImportDanceStyles(["Free style &amp; Choreography"]),
    ).toBe("Free style & Choreography");
  });
});

describe("ImportStudioDataDto", () => {
  it("accepts danceStyles as a string array on batches", async () => {
    const result = await pipe.transform(
      {
        batches: [
          {
            name: "RB1",
            category: "KIDS",
            danceStyles: ["Free style & Choreography"],
            frequency: "WEEKLY",
            weekdays: [4, 6],
            startTime: "18:00",
            endTime: "19:00",
            startDate: "2026-06-18",
            endDate: "2026-12-31",
            capacity: 20,
            enrollmentMode: "STAFF_ONLY",
          },
        ],
      },
      { type: "body", metatype: ImportStudioDataDto },
    );

    expect(result.batches?.[0]?.danceStyles).toBe("Free style & Choreography");
  });

  it("decodes HTML entities in danceStyles arrays", async () => {
    const result = await pipe.transform(
      {
        batches: [
          {
            name: "RB1",
            category: "KIDS",
            danceStyles: ["Free style &amp; Choreography"],
            frequency: "WEEKLY",
            weekdays: [4, 6],
            startTime: "18:00",
            endTime: "19:00",
            startDate: "2026-06-18",
            endDate: "2026-12-31",
            capacity: 20,
            enrollmentMode: "STAFF_ONLY",
          },
        ],
      },
      { type: "body", metatype: ImportStudioDataDto },
    );

    expect(result.batches?.[0]?.danceStyles).toBe("Free style & Choreography");
  });
});
