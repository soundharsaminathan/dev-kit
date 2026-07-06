import { useReducedMotion } from "motion/react";
import {
  getPresetExitTransition,
  getPresetTransition,
  getPresetVariants,
  type MotionPreset,
  type MotionVariants,
} from "./presets";

export function useMotionVariants(
  preset: MotionPreset,
  options?: { placement?: string; distance?: number },
): {
  variants: MotionVariants;
  transition: ReturnType<typeof getPresetTransition>;
  exitTransition: ReturnType<typeof getPresetExitTransition>;
  reducedMotion: boolean;
} {
  const reduced = useReducedMotion();
  const reducedMotion = Boolean(reduced);

  return {
    variants: getPresetVariants(preset, reduced, options),
    transition: getPresetTransition(preset, reduced),
    exitTransition: getPresetExitTransition(preset, reduced),
    reducedMotion,
  };
}

export function useCustomMotionVariants(
  getVariants: (reduced: boolean | null) => MotionVariants,
  getTransition?: (reduced: boolean | null) => object,
) {
  const reduced = useReducedMotion();
  const reducedMotion = Boolean(reduced);

  return {
    variants: getVariants(reduced),
    transition: getTransition?.(reduced) ?? {
      duration: reduced ? 0.2 : undefined,
    },
    reducedMotion,
  };
}
