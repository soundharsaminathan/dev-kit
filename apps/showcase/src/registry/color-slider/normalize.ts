import type { ControlValues } from "@/modules/showcase/types";

export type ColorSliderColorSpace = "hsb" | "hsl" | "rgb";

export type ColorSliderChannel =
  | "hue"
  | "saturation"
  | "brightness"
  | "lightness"
  | "red"
  | "green"
  | "blue"
  | "alpha";

const CHANNELS_BY_SPACE: Record<
  ColorSliderColorSpace,
  readonly ColorSliderChannel[]
> = {
  hsb: ["hue", "saturation", "brightness", "alpha"],
  hsl: ["hue", "saturation", "lightness", "alpha"],
  rgb: ["red", "green", "blue", "alpha"],
};

const CHANNEL_ALIASES: Partial<
  Record<
    ColorSliderChannel,
    Partial<Record<ColorSliderColorSpace, ColorSliderChannel>>
  >
> = {
  brightness: { hsl: "lightness" },
  lightness: { hsb: "brightness" },
};

export function normalizeColorSliderChannel(
  channel: string,
  colorSpace: ColorSliderColorSpace,
): ColorSliderChannel {
  const allowed = CHANNELS_BY_SPACE[colorSpace];
  if (allowed.includes(channel as ColorSliderChannel)) {
    return channel as ColorSliderChannel;
  }

  const alias = CHANNEL_ALIASES[channel as ColorSliderChannel]?.[colorSpace];
  if (alias) {
    return alias;
  }

  return allowed[0]!;
}

export function normalizeColorSliderValues(
  values: ControlValues,
): ControlValues {
  const colorSpace =
    (values.colorSpace as ColorSliderColorSpace | undefined) ?? "hsb";
  const channel = String(values.channel ?? "hue");

  return {
    ...values,
    colorSpace,
    channel: normalizeColorSliderChannel(channel, colorSpace),
  };
}
