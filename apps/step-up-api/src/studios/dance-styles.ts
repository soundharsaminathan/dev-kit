import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const MAX_DANCE_STYLES = 40;
const MAX_DANCE_STYLES_BYTES = 50_000;

const danceStyleSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Style id must be a lowercase slug"),
    label: z.string().trim().min(1).max(80),
    abbrev: z.string().trim().min(1).max(4),
    color: z.string().trim().regex(HEX_COLOR, "Color must be a hex value"),
    emoji: z.string().trim().min(1).max(16),
  })
  .strict();

const danceStylesSchema = z.array(danceStyleSchema).max(MAX_DANCE_STYLES);

export type StudioDanceStyle = z.infer<typeof danceStyleSchema>;

export function parseDanceStyles(value: unknown): StudioDanceStyle[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_DANCE_STYLES_BYTES) {
    throw new BadRequestException(
      `danceStyles exceeds ${MAX_DANCE_STYLES_BYTES} bytes`,
    );
  }

  const parsed = danceStylesSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(
      parsed.error.issues[0]?.message ?? "Invalid danceStyles",
    );
  }

  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const style of parsed.data) {
    if (ids.has(style.id)) {
      throw new BadRequestException(`Duplicate dance style id: ${style.id}`);
    }
    const labelKey = style.label.toLowerCase();
    if (labels.has(labelKey)) {
      throw new BadRequestException(
        `Duplicate dance style label: ${style.label}`,
      );
    }
    ids.add(style.id);
    labels.add(labelKey);
  }

  return parsed.data;
}
