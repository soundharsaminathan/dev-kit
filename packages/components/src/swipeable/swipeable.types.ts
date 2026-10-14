import type * as React from "react";

export type SwipeableDirection = "horizontal" | "vertical";

export type SwipeableRevealSide = "left" | "right" | null;

export interface SwipeableProps {
  /**
   * Axis along which the gesture is tracked. Defaults to `"horizontal"`.
   * `leftActions`/`rightActions` are only revealed for horizontal swipeables.
   */
  direction?: SwipeableDirection | undefined;
  /**
   * Distance in px that a swipe must travel before `onSwipe*` fires.
   * Defaults to `80`.
   */
  threshold?: number | undefined;
  /**
   * Distance in px a slower drag must travel before the action panel snaps
   * open. Defaults to `24`.
   */
  minSnapOpen?: number | undefined;
  /** Fired when a left swipe completes past the threshold. */
  onSwipeLeft?: (() => void) | undefined;
  /** Fired when a right swipe completes past the threshold. */
  onSwipeRight?: (() => void) | undefined;
  /** Fired when an up swipe completes past the threshold (vertical only). */
  onSwipeUp?: (() => void) | undefined;
  /** Fired when a down swipe completes past the threshold (vertical only). */
  onSwipeDown?: (() => void) | undefined;
  /**
   * Actions revealed on the left edge when the surface is dragged right.
   * These are real focusable controls, hidden (`inert`) while closed.
   */
  leftActions?: React.ReactNode | undefined;
  /**
   * Actions revealed on the right edge when the surface is dragged left.
   * These are real focusable controls, hidden (`inert`) while closed.
   */
  rightActions?: React.ReactNode | undefined;
  /**
   * Always-visible action menu rendered beside the surface. This is the
   * accessible fallback for keyboard and screen-reader users who cannot
   * (or choose not to) swipe.
   */
  fallbackActions?: React.ReactNode | undefined;
  /** Called whenever the revealed side changes. */
  onRevealChange?: ((side: SwipeableRevealSide) => void) | undefined;
  /** Accessible name for the swipe surface group. */
  ariaLabel?: string | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
}
