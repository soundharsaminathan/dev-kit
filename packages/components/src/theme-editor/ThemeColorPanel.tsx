import { cn } from "@dev-ui/core";
import {
  type ColorSeedKey,
  DEFAULT_COLOR_CONFIG,
  resolveColorConfig,
  setColorSeed,
  type ThemeDraft,
} from "@dev-ui/tokens";
import { type Color, parseColor } from "@react-stately/color";
import { useId, useMemo, useState } from "react";
import { ColorEditor } from "../color-editor/ColorEditor";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorPanelProps } from "./theme-editor.types";

interface ColorSlot {
  key: ColorSeedKey;
  label: string;
  hint: string;
}

const COLOR_SLOTS: readonly ColorSlot[] = [
  {
    key: "accent",
    label: "Brand",
    hint: "Buttons, links, and anything highlighted",
  },
  {
    key: "neutral",
    label: "Base",
    hint: "Backgrounds, text, and borders",
  },
  {
    key: "success",
    label: "Success",
    hint: "Confirmations and positive states",
  },
  {
    key: "warning",
    label: "Warning",
    hint: "Cautions and pending states",
  },
  {
    key: "danger",
    label: "Danger",
    hint: "Errors and destructive actions",
  },
  {
    key: "info",
    label: "Info",
    hint: "Tips and neutral notices",
  },
];

const SEED_PRESETS: Record<ColorSeedKey, readonly string[]> = {
  accent: [
    "#6366f1",
    "#3b82f6",
    "#0ea5e9",
    "#14b8a6",
    "#22c55e",
    "#f59e0b",
    "#f97316",
    "#ef4444",
    "#ec4899",
    "#8b5cf6",
  ],
  neutral: ["#737373", "#71717a", "#64748b", "#78716c", "#6b7280"],
  success: ["#22c55e", "#16a34a", "#10b981", "#059669", "#84cc16"],
  warning: ["#eab308", "#facc15", "#f59e0b", "#d97706", "#f97316"],
  danger: ["#ef4444", "#dc2626", "#b91c1c", "#f43f5e", "#e11d48"],
  info: ["#3b82f6", "#2563eb", "#0ea5e9", "#06b6d4", "#6366f1"],
};

const FALLBACK_SEED = "#808080";

function seedValue(draft: ThemeDraft, key: ColorSeedKey): string {
  const seed = draft.color.seeds[key]?.trim();
  return seed || DEFAULT_COLOR_CONFIG.seeds[key] || FALLBACK_SEED;
}

function toColor(value: string): Color {
  try {
    return parseColor(value);
  } catch {
    return parseColor(FALLBACK_SEED);
  }
}

function RampPreview({
  label,
  ramp,
}: {
  label: string;
  ramp: Record<string, string> | undefined;
}) {
  if (!ramp) return null;

  return (
    <div className={styles.ramp}>
      <span className={styles.rampLabel}>{label}</span>
      <div className={styles.rampSteps}>
        {Object.entries(ramp).map(([step, color]) => (
          <span
            key={step}
            className={styles.rampStep}
            style={{ backgroundColor: color }}
            title={`${label} ${step}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Color-only theme editor: pick the palette seeds, preview the generated ramps. */
function ThemeColorPanel({
  value,
  onChange,
  className,
}: ThemeEditorPanelProps) {
  const groupName = `theme-color-slot-${useId()}`;
  const [activeKey, setActiveKey] = useState<ColorSeedKey>("accent");
  const palettes = useMemo(() => {
    try {
      return resolveColorConfig(value.color);
    } catch {
      return resolveColorConfig(DEFAULT_COLOR_CONFIG);
    }
  }, [value.color]);

  const activeSlot =
    COLOR_SLOTS.find((slot) => slot.key === activeKey) ?? COLOR_SLOTS[0]!;
  const activeSeed = seedValue(value, activeSlot.key);

  const selectSeed = (seed: string) => {
    onChange(setColorSeed(value, activeSlot.key, seed));
  };

  return (
    <div className={cn(styles.colorPanel, className)}>
      <fieldset className={styles.slotRow}>
        <legend className={styles.srOnly}>Color to edit</legend>
        {COLOR_SLOTS.map((slot) => {
          const selected = slot.key === activeSlot.key;
          return (
            <label
              key={slot.key}
              className={styles.slot}
              data-selected={selected ? "true" : undefined}
            >
              <input
                type="radio"
                name={groupName}
                className={styles.slotInput}
                value={slot.key}
                checked={selected}
                onChange={() => setActiveKey(slot.key)}
              />
              <span
                className={styles.slotDot}
                style={{ backgroundColor: seedValue(value, slot.key) }}
              />
              {slot.label}
            </label>
          );
        })}
      </fieldset>

      <div className={styles.colorCard}>
        <div className={styles.colorCardHeader}>
          <div>
            <p className={styles.colorCardTitle}>{activeSlot.label} color</p>
            <p className={styles.colorCardHint}>{activeSlot.hint}</p>
          </div>
          <span className={styles.colorValue}>{activeSeed.toUpperCase()}</span>
        </div>

        <ColorEditor
          key={activeSlot.key}
          className={styles.colorEditor}
          value={toColor(activeSeed)}
          onChange={(color) => selectSeed(color.toString("hex"))}
          showFormatSelector={false}
        />

        <div className={styles.presets}>
          {SEED_PRESETS[activeSlot.key].map((preset) => {
            const isCurrent = preset.toLowerCase() === activeSeed.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                aria-label={`Use ${preset}`}
                aria-pressed={isCurrent}
                data-selected={isCurrent ? "true" : undefined}
                className={styles.preset}
                style={{ backgroundColor: preset }}
                onClick={() => selectSeed(preset)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.ramps}>
        <RampPreview label="Light" ramp={palettes.light[activeSlot.key]} />
        <RampPreview label="Dark" ramp={palettes.dark[activeSlot.key]} />
      </div>
    </div>
  );
}

export { ThemeColorPanel };
