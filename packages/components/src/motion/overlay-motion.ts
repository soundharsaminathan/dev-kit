import { EASE_OUT, SPRING_PANEL } from "./ease";

type MotionState = Record<string, number | string>;

type PanelMotion = {
  initial: MotionState;
  animate: MotionState;
  exit: MotionState;
};

type BackdropMotion = PanelMotion;

export function getBackdropMotion(reduced: boolean | null): BackdropMotion {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

export function getBackdropTransition(reduced: boolean | null) {
  return { duration: reduced ? 0 : 0.2, ease: EASE_OUT };
}

export function getModalPanelMotion(reduced: boolean | null): PanelMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, scale: 0.97, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 20 },
  };
}

export type OverlayPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top start"
  | "top end"
  | "bottom start"
  | "bottom end"
  | "left start"
  | "left end"
  | "right start"
  | "right end"
  | "start top"
  | "start bottom"
  | "end top"
  | "end bottom";

function resolvePlacementAxis(
  placement: string,
): "top" | "bottom" | "left" | "right" {
  if (placement.startsWith("top")) {
    return "top";
  }
  if (placement.startsWith("bottom")) {
    return "bottom";
  }
  if (placement.startsWith("left") || placement.startsWith("start")) {
    return "left";
  }
  return "right";
}

export function getPopoverPanelMotion(
  placement: string,
  reduced: boolean | null,
): PanelMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  const axis = resolvePlacementAxis(placement);
  const offset = 8;

  switch (axis) {
    case "top":
      return {
        initial: { opacity: 0, y: offset, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: offset, scale: 0.98 },
      };
    case "bottom":
      return {
        initial: { opacity: 0, y: -offset, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -offset, scale: 0.98 },
      };
    case "left":
      return {
        initial: { opacity: 0, x: offset, scale: 0.97 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: offset, scale: 0.98 },
      };
    case "right":
      return {
        initial: { opacity: 0, x: -offset, scale: 0.97 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -offset, scale: 0.98 },
      };
  }
}

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export function getToastItemMotion(
  position: ToastPosition,
  reduced: boolean | null,
): PanelMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  const offset = 40;

  if (position.startsWith("top")) {
    return {
      initial: { opacity: 0, y: -offset },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -offset },
    };
  }

  if (position.endsWith("left")) {
    return {
      initial: { opacity: 0, x: -offset },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -offset },
    };
  }

  if (position.endsWith("right") || position.endsWith("center")) {
    return {
      initial: { opacity: 0, x: offset },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: offset },
    };
  }

  return {
    initial: { opacity: 0, y: offset },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: offset },
  };
}

export function getOverlayTransition(
  reduced: boolean | null,
  spring: typeof SPRING_PANEL = SPRING_PANEL,
) {
  return reduced ? { duration: 0.2, ease: EASE_OUT } : spring;
}

export function getToastItemTransition(reduced: boolean | null) {
  return reduced
    ? { duration: 0.2, ease: EASE_OUT }
    : { duration: 0.35, ease: EASE_OUT };
}
