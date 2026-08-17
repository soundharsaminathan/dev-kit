import { useIsMobile } from "@dev-ui/hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { type DanceStyle, resolveDanceStyle } from "@/lib/dance-styles";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";
import styles from "./style-spree-picker.module.scss";

type Particle = {
  id: string;
  emoji: string;
  xOffset: number;
  rotate: number;
};

type StyleSpreePickerProps = {
  value: string[];
  onChange: (styles: string[]) => void;
  title?: string;
  summaryLabel?: string;
  catalog?: DanceStyle[];
  required?: boolean;
};

function FloatingEmoji({
  emoji,
  delay,
  xOffset,
  rotate,
}: {
  emoji: string;
  delay: number;
  xOffset: number;
  rotate: number;
}) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile(640);
  const [phase, setPhase] = useState<"up" | "down">("up");

  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 0, scale: 0.6, rotate: 0 }}
      animate={
        reduceMotion
          ? { y: -48, opacity: [0, 1, 0], scale: 1 }
          : {
              y: [0, isMobile ? -72 : -96, isMobile ? -72 : -96, 16],
              x: [
                0,
                xOffset * (isMobile ? 0.35 : 0.5),
                xOffset * (isMobile ? 0.25 : 0.4),
              ],
              opacity: [0, 1, 1, 0],
              scale: [0.7, isMobile ? 1.35 : 1.55, isMobile ? 1.35 : 1.55, 0.7],
              rotate: [0, rotate, rotate * 0.5],
            }
      }
      transition={{
        duration: reduceMotion ? 0.4 : 0.85,
        ease: "easeInOut",
        delay: reduceMotion ? 0 : delay,
      }}
      onUpdate={(latest) => {
        if (typeof latest.y === "number") {
          const threshold = isMobile ? -36 : -48;
          setPhase(latest.y < threshold ? "up" : "down");
        }
      }}
      className={`${styles.particle} ${
        phase === "up" ? styles.particleAbove : styles.particleBelow
      }`}
    >
      {emoji}
    </motion.div>
  );
}

export function StyleSpreePicker({
  value,
  onChange,
  title = "Dance styles",
  summaryLabel = "styles",
  catalog: catalogProp,
  required,
}: StyleSpreePickerProps) {
  const { styles: studioStyles } = useStudioDanceStyles();
  const catalog = catalogProp ?? studioStyles;
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabels = useMemo(
    () =>
      new Set(value.map((entry) => resolveDanceStyle(entry, catalog).label)),
    [value, catalog],
  );

  const rows = useMemo(() => {
    const result: DanceStyle[][] = [[], [], []];
    catalog.forEach((item, index) => {
      result[index % 3]!.push(item);
    });
    return result;
  }, [catalog]);

  function spawnParticles(emoji: string) {
    const newParticles: Particle[] = Array.from({ length: 3 }).map(() => ({
      id: crypto.randomUUID(),
      emoji,
      xOffset: (Math.random() - 0.5) * 96,
      rotate: (Math.random() - 0.5) * 28,
    }));

    setParticles(newParticles);
    window.setTimeout(() => setParticles([]), 1600);
  }

  function toggleStyle(label: string, emoji: string) {
    const next = new Set(selectedLabels);
    const exists = next.has(label);

    if (exists) {
      next.delete(label);
    } else {
      next.add(label);
      spawnParticles(emoji);
    }

    onChange(
      catalog
        .filter((style) => next.has(style.label))
        .map((style) => style.label),
    );
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>
        {title}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </h2>

      <motion.div
        ref={containerRef}
        className={`${styles.viewport} ${
          isPanning ? styles.viewportPanning : styles.viewportScroll
        }`}
      >
        <motion.div
          drag="x"
          dragConstraints={containerRef}
          onPanStart={() => setIsPanning(true)}
          onPanEnd={() => setIsPanning(false)}
          className={styles.track}
        >
          {rows.map((row, rowIndex) => {
            if (row.length === 0) return null;
            return (
              <div
                key={row.map((s) => s.id).join("-") || `row-${rowIndex}`}
                className={styles.row}
              >
                {row.map((style, styleIndex) => {
                  const selected = selectedLabels.has(style.label);
                  return (
                    <motion.button
                      key={style.id || `${style.label}-${styleIndex}`}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                      }}
                      onClick={() => toggleStyle(style.label, style.emoji)}
                      className={`${styles.chip} ${
                        selected ? styles.chipSelected : ""
                      }`}
                      aria-pressed={selected}
                    >
                      <span className={styles.chipEmoji}>{style.emoji}</span>
                      <span>{style.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            );
          })}
        </motion.div>
      </motion.div>

      <div className={styles.particles}>
        <AnimatePresence>
          {particles.map((particle, index) => (
            <FloatingEmoji
              key={particle.id}
              emoji={particle.emoji}
              delay={index * 0.08}
              xOffset={particle.xOffset}
              rotate={particle.rotate}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedLabels.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={styles.summary}
          >
            {selectedLabels.size} {summaryLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
