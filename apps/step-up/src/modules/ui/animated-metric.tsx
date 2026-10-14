import { useEffect, useRef, useState } from "react";

type AnimatedMetricProps = {
  value: number;
  durationMs?: number;
  className?: string | undefined;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function AnimatedMetric({
  value,
  durationMs = 800,
  className,
}: AnimatedMetricProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      previousValue.current = value;
      setDisplay(value);
      return;
    }

    if (previousValue.current === value) {
      return;
    }

    const from = previousValue.current;
    previousValue.current = value;

    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const delta = value - from;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(Math.round(from + easeOutCubic(progress) * delta));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs, reducedMotion]);

  return <strong className={className}>{display}</strong>;
}
