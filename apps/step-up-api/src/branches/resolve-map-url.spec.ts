import { describe, expect, it, vi } from "vitest";
import {
  assertAllowedMapUrl,
  followMapRedirects,
  isAllowedMapHost,
} from "./resolve-map-url";

describe("resolve-map-url", () => {
  it("allows Google and OSM hosts only", () => {
    expect(isAllowedMapHost("maps.app.goo.gl")).toBe(true);
    expect(isAllowedMapHost("www.google.com")).toBe(true);
    expect(isAllowedMapHost("www.openstreetmap.org")).toBe(true);
    expect(isAllowedMapHost("evil.example")).toBe(false);
    expect(() => assertAllowedMapUrl("https://evil.example/x")).toThrow(
      /Only Google Maps/,
    );
  });

  it("follows redirects within allowed hosts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://www.google.com/maps/@12.9716,77.5946,17z",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );

    await expect(
      followMapRedirects("https://maps.app.goo.gl/abc", fetchImpl),
    ).resolves.toBe("https://www.google.com/maps/@12.9716,77.5946,17z");
  });

  it("rejects redirect targets outside allowlist", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/phish" },
      }),
    );

    await expect(
      followMapRedirects("https://maps.app.goo.gl/abc", fetchImpl),
    ).rejects.toThrow(/Only Google Maps/);
  });
});
