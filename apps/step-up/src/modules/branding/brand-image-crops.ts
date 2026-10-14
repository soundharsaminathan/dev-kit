export type BrandImageKind = "logo" | "heroMobile" | "heroDesktop";

export const BRAND_IMAGE_CROPS: Record<
  BrandImageKind,
  {
    aspect: number;
    cropShape: "rect" | "round";
    title: string;
    /** Suggested export size matching /me hero + chrome usage. */
    sizeHint: string;
  }
> = {
  logo: {
    aspect: 4,
    cropShape: "rect",
    title: "Crop logo",
    sizeHint: "1024 × 256 · 4:1",
  },
  heroMobile: {
    aspect: 16 / 9,
    cropShape: "rect",
    title: "Crop mobile hero",
    sizeHint: "1170 × 658 · 16:9",
  },
  heroDesktop: {
    aspect: 3,
    cropShape: "rect",
    title: "Crop desktop hero",
    sizeHint: "1920 × 640 · 3:1",
  },
};
