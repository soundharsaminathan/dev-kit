import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const BUILT_IN_THEME_IDS = [
  "default",
  "material",
  "glassmorphism",
  "neumorphism",
  "neo-brutalism",
  "aurora",
  "terminal",
  "step-up",
  "step-up-soft",
] as const;

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const MAX_BRAND_THEME_BYTES = 100_000;

const colorSeedSchema = z
  .string()
  .regex(HEX_COLOR, "Color must be a hex value");

const brandThemeSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    extends: z.enum(BUILT_IN_THEME_IDS),
    color: z.object({
      algorithm: z.enum(["oklch", "tailwind", "contrast", "material"]),
      seeds: z
        .object({
          neutral: colorSeedSchema,
          accent: colorSeedSchema,
          success: colorSeedSchema.optional(),
          warning: colorSeedSchema.optional(),
          danger: colorSeedSchema.optional(),
          info: colorSeedSchema.optional(),
        })
        .strict(),
      knobs: z.record(z.string(), z.unknown()).optional(),
      steps: z.array(z.string()).optional(),
    }),
    radiusFactor: z.number().min(0.25).max(4).optional(),
    fonts: z
      .object({
        sans: z.string().max(240).optional(),
        serif: z.string().max(240).optional(),
        mono: z.string().max(240).optional(),
      })
      .strict()
      .optional(),
    tokenOverrides: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type StudioBrandTheme = z.infer<typeof brandThemeSchema>;

export function parseBrandTheme(value: unknown): StudioBrandTheme | null {
  if (value === null || value === undefined) {
    return null;
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_BRAND_THEME_BYTES) {
    throw new BadRequestException(
      `brandTheme exceeds ${MAX_BRAND_THEME_BYTES} bytes`,
    );
  }

  const parsed = brandThemeSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(
      parsed.error.issues[0]?.message ?? "Invalid brandTheme",
    );
  }

  return parsed.data;
}
