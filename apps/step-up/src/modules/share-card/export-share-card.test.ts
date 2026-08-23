import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canShareFiles,
  downloadFile,
  shareOrDownloadShareCard,
} from "./export-share-card";
import type { BatchShareCardData } from "./types";

const data: BatchShareCardData = {
  batchName: "Hip Hop Crew",
  headline: "New Batch Starting!",
  cta: "Join This Batch",
  studioName: "Rhythm Studio",
};

vi.mock("./render-share-card", () => ({
  renderShareCard: vi.fn(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    canvas.toBlob = (cb: BlobCallback) => {
      cb(new Blob(["png"], { type: "image/png" }));
    };
    return canvas;
  }),
}));

describe("export-share-card", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects when file sharing is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareFiles(new File(["x"], "a.png", { type: "image/png" }))).toBe(
      false,
    );
  });

  it("shares via Web Share API when canShare allows files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await shareOrDownloadShareCard({
      data,
      layout: "fullBleed",
    });

    expect(result).toEqual({ mode: "shared" });
    expect(share).toHaveBeenCalled();
  });

  it("downloads when share is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        return {
          click,
          href: "",
          download: "",
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const result = await shareOrDownloadShareCard({
      data,
      layout: "heroBand",
    });

    expect(result).toEqual({ mode: "downloaded" });
    expect(click).toHaveBeenCalled();
  });

  it("downloads when share throws a non-abort error", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share failed"));
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        return {
          click,
          href: "",
          download: "",
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const result = await shareOrDownloadShareCard({
      data,
      layout: "studioFrame",
    });
    expect(result).toEqual({ mode: "downloaded" });
  });

  it("returns cancelled when the user aborts the share sheet", async () => {
    const abort = new DOMException("Abort", "AbortError");
    const share = vi.fn().mockRejectedValue(abort);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await shareOrDownloadShareCard({
      data,
      layout: "fullBleed",
    });
    expect(result).toEqual({ mode: "cancelled" });
  });

  it("downloadFile triggers an anchor click", () => {
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    downloadFile(new File(["png"], "story.png", { type: "image/png" }));
    expect(click).toHaveBeenCalled();
  });
});
