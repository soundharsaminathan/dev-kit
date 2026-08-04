import type { Transition } from "motion/react";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const EASE_IN = [0.7, 0, 0.84, 0] as const;

export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const satisfies Transition;

export const SPRING_PANEL = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 0.5,
} as const satisfies Transition;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const satisfies Transition;

export const TOAST_ENTER = {
  duration: 0.2,
  ease: EASE_OUT,
} as const satisfies Transition;

export const TOAST_EXIT = {
  duration: 0.18,
  ease: EASE_IN,
} as const satisfies Transition;
