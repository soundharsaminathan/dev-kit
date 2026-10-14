import { describe, expect, it } from "vitest";
import {
  MAX_BRANCH_IMAGES,
  MAX_BRANCH_VIDEOS,
  mediaKindFromFile,
  validateBranchMedia,
} from "./upload";

describe("branch media upload helpers", () => {
  it("accepts images and videos with size limits", () => {
    expect(MAX_BRANCH_IMAGES).toBe(24);
    expect(MAX_BRANCH_VIDEOS).toBe(6);

    const image = new File(["x"], "studio.jpg", { type: "image/jpeg" });
    Object.defineProperty(image, "size", { value: 1024 });
    expect(validateBranchMedia(image)).toBe("IMAGE");
    expect(mediaKindFromFile(image)).toBe("IMAGE");

    const video = new File(["x"], "promo.mp4", { type: "video/mp4" });
    Object.defineProperty(video, "size", { value: 1024 });
    expect(validateBranchMedia(video)).toBe("VIDEO");
  });

  it("rejects unsupported types and oversized files", () => {
    expect(() =>
      validateBranchMedia(new File(["x"], "notes.txt", { type: "text/plain" })),
    ).toThrow(/JPEG|PNG|WebP|GIF|MP4|WebM|images|videos/i);

    const huge = new File(["x"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", { value: 6 * 1024 * 1024 });
    expect(() => validateBranchMedia(huge)).toThrow(/5 MB/);
  });
});
