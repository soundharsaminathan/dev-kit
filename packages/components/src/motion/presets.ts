import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "./ease";

type MotionState = Record<string, number | string>;

export type MotionVariants = {
  initial: MotionState;
  animate: MotionState;
  exit: MotionState;
};

export type MotionPreset =
  | "fade"
  | "fadeUp"
  | "fadeDown"
  | "scale"
  | "pop"
  | "tooltip"
  | "dialog"
  | "menu"
  | "toast";

function opacityOnly(reduced: boolean | null): MotionVariants {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

export function getFadeVariants(reduced: boolean | null): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

export function getFadeUpVariants(
  reduced: boolean | null,
  distance = 20,
): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance },
  };
}

export function getFadeDownVariants(
  reduced: boolean | null,
  distance = 20,
): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  return {
    initial: { opacity: 0, y: -distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -distance },
  };
}

export function getScaleVariants(reduced: boolean | null): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  return {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };
}

export function getPopVariants(reduced: boolean | null): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  return {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };
}

export function getTooltipVariants(
  reduced: boolean | null,
  placement: string,
): MotionVariants {
  if (reduced) {
    return opacityOnly(reduced);
  }

  const offset = 10;
  const blur = "blur(6px)";
  const base = { opacity: 0, scale: 0.85, filter: blur };

  if (placement.startsWith("top")) {
    return {
      initial: { ...base, y: offset },
      animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
      exit: { ...base, y: offset },
    };
  }

  if (placement.startsWith("left") || placement.startsWith("start")) {
    return {
      initial: { ...base, x: offset },
      animate: { opacity: 1, scale: 1, x: 0, filter: "blur(0px)" },
      exit: { ...base, x: offset },
    };
  }

  if (placement.startsWith("right") || placement.startsWith("end")) {
    return {
      initial: { ...base, x: -offset },
      animate: { opacity: 1, scale: 1, x: 0, filter: "blur(0px)" },
      exit: { ...base, x: -offset },
    };
  }

  return {
    initial: { ...base, y: -offset },
    animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
    exit: { ...base, y: -offset },
  };
}

export function getStaggerContainer(reduced: boolean | null) {
  return {
    hidden: { opacity: reduced ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? { duration: 0 }
        : { staggerChildren: 0.035, delayChildren: 0.05 },
    },
  };
}

export function getStaggerItem(reduced: boolean | null) {
  if (reduced) {
    return {
      hidden: { opacity: 1 },
      show: { opacity: 1 },
    };
  }

  return {
    hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" },
  };
}

export function getPresetVariants(
  preset: MotionPreset,
  reduced: boolean | null,
  options?: { placement?: string; distance?: number },
): MotionVariants {
  switch (preset) {
    case "fade":
      return getFadeVariants(reduced);
    case "fadeUp":
      return getFadeUpVariants(reduced, options?.distance);
    case "fadeDown":
      return getFadeDownVariants(reduced, options?.distance);
    case "scale":
      return getScaleVariants(reduced);
    case "pop":
      return getPopVariants(reduced);
    case "tooltip":
      return getTooltipVariants(reduced, options?.placement ?? "bottom");
    case "dialog":
      return getScaleVariants(reduced);
    case "menu":
      return getPopVariants(reduced);
    case "toast":
      return getFadeUpVariants(reduced, options?.distance ?? 40);
    default:
      return getFadeVariants(reduced);
  }
}

export function getPresetTransition(
  preset: MotionPreset,
  reduced: boolean | null,
) {
  if (reduced) {
    return { duration: 0.2, ease: EASE_OUT };
  }

  switch (preset) {
    case "tooltip":
      return SPRING_PANEL;
    case "menu":
    case "pop":
      return SPRING_PANEL;
    case "dialog":
      return SPRING_PANEL;
    case "toast":
      return { duration: 0.35, ease: EASE_OUT };
    default:
      return SPRING_PANEL;
  }
}

export function getPresetExitTransition(
  preset: MotionPreset,
  reduced: boolean | null,
) {
  if (reduced) {
    return { duration: 0.14, ease: EASE_OUT };
  }

  if (preset === "tooltip") {
    return { duration: 0.14, ease: EASE_OUT };
  }

  return { duration: 0.18, ease: EASE_OUT };
}

export function getLayoutTransition(reduced: boolean | null) {
  return reduced ? { duration: 0 } : SPRING_LAYOUT;
}

export function getSwapTransition(reduced: boolean | null) {
  return reduced ? { duration: 0 } : SPRING_SWAP;
}
