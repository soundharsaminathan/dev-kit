import { useReducedMotion } from "motion/react";
import { useHoverCapable } from "../hooks/use-hover-capable";

export function useMotionConfig() {
  const reducedMotion = useReducedMotion();
  const canHover = useHoverCapable();

  return {
    reducedMotion: Boolean(reducedMotion),
    canHover,
    motionEnabled: !reducedMotion,
    hoverMotionEnabled: !reducedMotion && canHover,
  };
}
