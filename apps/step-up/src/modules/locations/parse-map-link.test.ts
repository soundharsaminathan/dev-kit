import { describe, expect, it } from "vitest";
import { isShortMapLink, parseMapLink } from "./parse-map-link";
import { mapsUrl } from "./types";

describe("parseMapLink", () => {
  it("parses Google Maps @lat,lng viewport links", () => {
    expect(
      parseMapLink(
        "https://www.google.com/maps/place/Studio/@12.9715987,77.5945627,17z",
      ),
    ).toEqual({ latitude: 12.9715987, longitude: 77.5945627 });
  });

  it("prefers place pin !3d!4d over viewport @ coords", () => {
    expect(
      parseMapLink(
        "https://www.google.com/maps/place/Foo/@12.97,77.59,17z/data=!3d12.9716!4d77.5946",
      ),
    ).toEqual({ latitude: 12.9716, longitude: 77.5946 });
  });

  it("parses q=lat,lng and query params", () => {
    expect(parseMapLink("https://maps.google.com/?q=12.9716,77.5946")).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(
      parseMapLink(
        "https://www.google.com/maps/search/?api=1&query=12.9716%2C77.5946",
      ),
    ).toEqual({ latitude: 12.9716, longitude: 77.5946 });
  });

  it("parses OpenStreetMap and geo links", () => {
    expect(
      parseMapLink(
        "https://www.openstreetmap.org/?mlat=12.9716&mlon=77.5946#map=16/12.9716/77.5946",
      ),
    ).toEqual({ latitude: 12.9716, longitude: 77.5946 });
    expect(parseMapLink("geo:12.9716,77.5946")).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
    });
  });

  it("parses bare coordinate pairs", () => {
    expect(parseMapLink("12.9716, 77.5946")).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
    });
  });

  it("rejects place-name queries and invalid ranges", () => {
    expect(
      parseMapLink(
        "https://www.google.com/maps/search/?api=1&query=Indiranagar",
      ),
    ).toBeNull();
    expect(parseMapLink("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseMapLink("99.5, 77.5")).toBeNull();
  });
});

describe("isShortMapLink", () => {
  it("detects Google short hosts", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isShortMapLink("https://goo.gl/maps/abc123")).toBe(true);
    expect(isShortMapLink("https://www.google.com/maps/@12.97,77.59,17z")).toBe(
      false,
    );
  });
});

describe("mapsUrl", () => {
  it("builds a Google Maps link from saved coordinates", () => {
    expect(mapsUrl(12.9716, 77.5946)).toBe(
      "https://www.google.com/maps?q=12.9716,77.5946",
    );
  });
});
