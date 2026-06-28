import type { DrawerPlacement } from "../drawer/drawer.types";
import { EASE_OUT, SPRING_PANEL } from "./ease";

type DrawerPanelMotion = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
};

export function getDrawerPanelMotion(
  placement: DrawerPlacement,
  reduced: boolean | null,
): DrawerPanelMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  switch (placement) {
    case "bottom":
      return {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
      };
    case "top":
      return {
        initial: { y: "-100%" },
        animate: { y: 0 },
        exit: { y: "-100%" },
      };
    case "left":
      return {
        initial: { x: "-100%" },
        animate: { x: 0 },
        exit: { x: "-100%" },
      };
    case "right":
      return {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      };
  }
}

export function getDrawerPanelTransition(reduced: boolean | null) {
  return reduced ? { duration: 0.2, ease: EASE_OUT } : SPRING_PANEL;
}
