import { cn } from "@dev-ui/core";
import { motion, useReducedMotion } from "motion/react";
import { SPRING_LAYOUT } from "./ease";

type LayoutIndicatorProps = {
  layoutId: string;
  className?: string | undefined;
};

function LayoutIndicator({ layoutId, className }: LayoutIndicatorProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      data-tab-indicator=""
      transition={reducedMotion ? { duration: 0 } : SPRING_LAYOUT}
      className={cn(className)}
    />
  );
}

export { LayoutIndicator };
