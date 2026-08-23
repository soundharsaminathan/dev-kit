import { beforeEach, describe, expect, it, vi } from "vitest";
import { coverFitRect, studioMonogram } from "./load-image";
import { renderShareCard } from "./render-share-card";
import type { BatchShareCardData } from "./types";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "./types";

function mockContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: String(text).length * 12 })),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };
}

describe("studioMonogram / coverFitRect", () => {
  it("builds initials from studio names", () => {
    expect(studioMonogram("Rhythm Studio")).toBe("RS");
    expect(studioMonogram("Step")).toBe("ST");
    expect(studioMonogram("  ")).toBe("SU");
  });

  it("center-crops wide and tall images", () => {
    const wide = coverFitRect(2000, 1000, 0, 0, 1080, 1920);
    expect(wide.sw).toBeLessThan(2000);
    expect(wide.sh).toBe(1000);
    expect(wide.dw).toBe(1080);
    expect(wide.dh).toBe(1920);

    const tall = coverFitRect(800, 2000, 10, 20, 400, 400);
    expect(tall.sw).toBe(800);
    expect(tall.sh).toBeLessThan(2000);
    expect(tall.dx).toBe(10);
    expect(tall.dy).toBe(20);
  });
});

describe("renderShareCard", () => {
  const data: BatchShareCardData = {
    batchName: "Hip Hop Crew",
    headline: "New Batch Starting!",
    cta: "Join This Batch",
    studioName: "Rhythm Studio",
    danceStyle: "Hip Hop",
    trainerName: "Asha",
    schedule: "Mon Wed",
    ageGroup: "Adults",
    location: "Indiranagar",
    studioPrimaryColor: "#E4572E",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("paints all layouts at 1080×1920 without a cover image", async () => {
    for (const layout of ["fullBleed", "heroBand", "studioFrame"] as const) {
      const ctx = mockContext();
      const canvas = document.createElement("canvas");
      vi.spyOn(canvas, "getContext").mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );

      const result = await renderShareCard({
        data,
        layout,
        canvas,
        coverImage: null,
        logoImage: null,
      });

      expect(result.width).toBe(SHARE_CARD_WIDTH);
      expect(result.height).toBe(SHARE_CARD_HEIGHT);
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
    }
  });

  it("accepts a cover image for fullBleed", async () => {
    const ctx = mockContext();
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const cover = {
      width: 1200,
      height: 1800,
    } as HTMLImageElement;

    await renderShareCard({
      data: { ...data, coverImageUrl: "https://cdn.example/cover.jpg" },
      layout: "fullBleed",
      canvas,
      coverImage: cover,
      logoImage: null,
    });

    expect(ctx.drawImage).toHaveBeenCalled();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it("throws when canvas context is unavailable", async () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    await expect(
      renderShareCard({
        data,
        layout: "heroBand",
        canvas,
        coverImage: null,
        logoImage: null,
      }),
    ).rejects.toThrow(/canvas/i);
  });
});
