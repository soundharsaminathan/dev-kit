import type { HTMLMotionProps } from "motion/react";
import { type RefObject, useLayoutEffect, useState } from "react";
import { SPRING_PRESS } from "./ease";
import { readCssNumber } from "./read-css-number";
import { useMotionConfig } from "./use-motion-config";

export type PressAnimationOptions = {
  enabled?: boolean;
  hoverVar?: string;
  pressVar?: string;
};

type PressMotionProps = Pick<
  HTMLMotionProps<"button">,
  "whileTap" | "whileHover" | "transition"
>;

export function usePressAnimation(
  ref: RefObject<HTMLElement | null>,
  {
    enabled = true,
    hoverVar = "--btn-hover-scale",
    pressVar = "--btn-press-scale",
  }: PressAnimationOptions = {},
): {
  enabled: boolean;
  motionProps: PressMotionProps;
} {
  const { motionEnabled, hoverMotionEnabled } = useMotionConfig();
  const useMotionPress = enabled && motionEnabled;
  const [scales, setScales] = useState<{
    hover: number;
    press: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!useMotionPress) {
      setScales(null);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const hover = readCssNumber(element, hoverVar);
    const press = readCssNumber(element, pressVar);

    if (hover !== undefined && press !== undefined) {
      setScales({ hover, press });
    }
  }, [useMotionPress, ref, hoverVar, pressVar]);

  if (!useMotionPress || !scales) {
    return { enabled: false, motionProps: {} };
  }

  const motionProps: PressMotionProps = {
    whileTap: { scale: scales.press },
    transition: SPRING_PRESS,
  };

  if (hoverMotionEnabled) {
    motionProps.whileHover = { scale: scales.hover };
  }

  return {
    enabled: true,
    motionProps,
  };
}
