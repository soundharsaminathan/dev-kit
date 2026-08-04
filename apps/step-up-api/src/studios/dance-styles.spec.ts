import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseDanceStyles } from "./dance-styles";

describe("parseDanceStyles", () => {
  it("returns null for nullish values", () => {
    expect(parseDanceStyles(null)).toBeNull();
    expect(parseDanceStyles(undefined)).toBeNull();
  });

  it("accepts a valid catalog", () => {
    const styles = [
      {
        id: "hip-hop",
        label: "Hip Hop",
        abbrev: "HH",
        color: "#E4572E",
        emoji: "🎤",
      },
    ];
    expect(parseDanceStyles(styles)).toEqual(styles);
  });

  it("rejects duplicate labels", () => {
    expect(() =>
      parseDanceStyles([
        {
          id: "a",
          label: "Hip Hop",
          abbrev: "HH",
          color: "#E4572E",
          emoji: "🎤",
        },
        {
          id: "b",
          label: "hip hop",
          abbrev: "HP",
          color: "#0984E3",
          emoji: "💃",
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it("rejects invalid color", () => {
    expect(() =>
      parseDanceStyles([
        {
          id: "hip-hop",
          label: "Hip Hop",
          abbrev: "HH",
          color: "red",
          emoji: "🎤",
        },
      ]),
    ).toThrow(BadRequestException);
  });
});
