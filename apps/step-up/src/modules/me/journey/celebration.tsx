import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import styles from "./celebration.module.scss";

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
};

const COLORS = [
  "var(--accent)",
  "var(--soft-accent, var(--accent))",
  "var(--tag-mint-fg, var(--accent))",
  "var(--tag-lilac-fg, var(--accent))",
];

type CelebrationProps = {
  active: boolean;
};

export function Celebration({ active }: CelebrationProps) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active || reducedMotion) {
      setParticles([]);
      return;
    }
    const next = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 10 + Math.random() * 30,
      color: COLORS[i % COLORS.length]!,
      delay: Math.random() * 0.35,
    }));
    setParticles(next);
    const timer = setTimeout(() => setParticles([]), 1600);
    return () => clearTimeout(timer);
  }, [active, reducedMotion]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.root} aria-hidden>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={styles.particle}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: particle.color,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
