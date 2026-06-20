import { SEMANTIC_COLORS } from "../vendor/color-kernel.js";

export const GENERATIVE_ALGORITHMS = [
  "oklch",
  "tailwind",
  "contrast",
  "material",
] as const;
export type AlgorithmId = (typeof GENERATIVE_ALGORITHMS)[number];

export interface PaletteSeeds {
  neutral: string;
  accent: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
}

export interface ColorKnobs {
  chromaMult?: number;
  minChroma?: number;
  hueTorsion?: number;
  chromaMode?: "consistent" | "max";
  preserveSeedAt?: string;
  formula?: "wcag2" | "apca";
  saturation?: number;
  ratios?: number[];
  tones?: number[];
}

export interface ColorConfig {
  algorithm: AlgorithmId;
  steps?: string[];
  seeds: PaletteSeeds;
  knobs?: ColorKnobs;
}

export const DEFAULT_COLOR_CONFIG: ColorConfig = {
  algorithm: "oklch",
  seeds: {
    neutral: "#808080",
    accent: "#438cd6",
    success: SEMANTIC_COLORS.success,
    warning: SEMANTIC_COLORS.warning,
    danger: SEMANTIC_COLORS.danger,
    info: SEMANTIC_COLORS.info,
  },
};
