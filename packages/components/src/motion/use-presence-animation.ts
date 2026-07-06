import { useReducedMotion } from "motion/react";
import {
  getBackdropMotion,
  getBackdropTransition,
  getModalPanelMotion,
  getOverlayTransition,
  getPopoverPanelMotion,
  getToastItemMotion,
  type ToastPosition,
} from "./overlay-motion";
import {
  getPresetExitTransition,
  getPresetTransition,
  getPresetVariants,
  getTooltipVariants,
  type MotionPreset,
} from "./presets";

export type PresencePreset =
  | MotionPreset
  | "modal"
  | "popover"
  | "backdrop"
  | "toast";

export function usePresenceAnimation(
  preset: PresencePreset,
  options?: {
    placement?: string;
    toastPosition?: ToastPosition;
  },
) {
  const reduced = useReducedMotion();
  const reducedMotion = Boolean(reduced);

  switch (preset) {
    case "backdrop":
      return {
        reducedMotion,
        motion: getBackdropMotion(reduced),
        transition: getBackdropTransition(reduced),
        exitTransition: getBackdropTransition(reduced),
      };
    case "modal":
      return {
        reducedMotion,
        motion: getModalPanelMotion(reduced),
        transition: getOverlayTransition(reduced),
        exitTransition: getOverlayTransition(reduced),
      };
    case "popover":
      return {
        reducedMotion,
        motion: getPopoverPanelMotion(options?.placement ?? "bottom", reduced),
        transition: getOverlayTransition(reduced),
        exitTransition: getOverlayTransition(reduced),
      };
    case "toast":
      return {
        reducedMotion,
        motion: getToastItemMotion(
          options?.toastPosition ?? "bottom-center",
          reduced,
        ),
        transition: getPresetTransition("toast", reduced),
        exitTransition: getPresetExitTransition("toast", reduced),
      };
    case "tooltip":
      return {
        reducedMotion,
        motion: getTooltipVariants(reduced, options?.placement ?? "bottom"),
        transition: getPresetTransition("tooltip", reduced),
        exitTransition: getPresetExitTransition("tooltip", reduced),
      };
    default:
      return {
        reducedMotion,
        motion: getPresetVariants(preset, reduced, options),
        transition: getPresetTransition(preset, reduced),
        exitTransition: getPresetExitTransition(preset, reduced),
      };
  }
}
