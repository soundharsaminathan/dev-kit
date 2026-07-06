import { useMotionConfig } from "./use-motion-config";

export function useHoverAnimation(enabled = true) {
  const { hoverMotionEnabled } = useMotionConfig();
  return enabled && hoverMotionEnabled;
}
