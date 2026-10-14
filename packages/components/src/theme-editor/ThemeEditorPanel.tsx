import { cn } from "@dev-ui/core";
import {
  getBuiltInThemeIds,
  listEditableTokensByLayer,
  resolveThemeDraft,
  setTokenOverride,
  type ThemeDraft,
  type ThemeFonts,
  TOKEN_LAYER_LABELS,
  TOKEN_LAYER_ORDER,
  type TokenLayerKey,
} from "@dev-ui/tokens";
import { useMemo } from "react";
import { Input } from "../input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../select/Select";
import { ThemeColorPanel } from "./ThemeColorPanel";
import { TokenLayerPanel } from "./TokenLayerPanel";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorPanelProps } from "./theme-editor.types";

const FONT_KEYS = [
  "sans",
  "serif",
  "mono",
] as const satisfies readonly (keyof ThemeFonts)[];

function ThemeEditorPanel({
  value,
  onChange,
  className,
}: ThemeEditorPanelProps) {
  const resolved = useMemo(() => resolveThemeDraft(value), [value]);
  const tokensByLayer = useMemo(
    () => listEditableTokensByLayer(value, resolved),
    [value, resolved],
  );

  const handleTokenChange = (
    layer: TokenLayerKey,
    name: string,
    nextValue: string | null,
    category: Parameters<typeof setTokenOverride>[4],
  ) => {
    onChange(setTokenOverride(value, layer, name, nextValue, category));
  };

  const handleFontChange = (key: keyof ThemeFonts, next: string) => {
    const fonts: ThemeFonts = { ...value.fonts };
    if (next.trim() === "") {
      delete fonts[key];
    } else {
      fonts[key] = next;
    }
    const nextDraft: ThemeDraft = { ...value };
    if (Object.keys(fonts).length === 0) {
      delete nextDraft.fonts;
    } else {
      nextDraft.fonts = fonts;
    }
    onChange(nextDraft);
  };

  return (
    <div className={cn(styles.panel, className)}>
      <div className={styles.section}>
        <div className={styles.metaGrid}>
          <div className={styles.seedBlock}>
            <span className={styles.seedLabel}>Theme name</span>
            <Input
              aria-label="Theme name"
              value={value.label}
              onChange={(event) =>
                onChange({ ...value, label: event.target.value })
              }
            />
          </div>

          <div className={styles.seedBlock}>
            <span className={styles.seedLabel}>Base style</span>
            <Select
              aria-label="Base style"
              value={value.extends}
              onChange={(key) => {
                if (key) {
                  onChange({ ...value, extends: String(key) });
                }
              }}
            >
              <SelectTrigger />
              <SelectContent>
                {getBuiltInThemeIds().map((id) => (
                  <SelectItem key={id} id={id}>
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.seedBlock}>
            <span className={styles.seedLabel}>Radius factor</span>
            <Input
              aria-label="Radius factor"
              type="number"
              min={0.25}
              max={4}
              step={0.05}
              value={String(value.radiusFactor ?? 1)}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) return;
                onChange({ ...value, radiusFactor: next });
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.seedLabel}>Colors</span>
        <ThemeColorPanel value={value} onChange={onChange} />
      </div>

      <div className={styles.section}>
        <span className={styles.seedLabel}>Fonts</span>
        <div className={styles.metaGrid}>
          {FONT_KEYS.map((key) => (
            <div key={key} className={styles.seedBlock}>
              <span className={styles.seedLabel}>{key}</span>
              <Input
                aria-label={`${key} font`}
                value={value.fonts?.[key] ?? ""}
                placeholder="Font stack"
                onChange={(event) => handleFontChange(key, event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.seedLabel}>Token layers</span>
        {TOKEN_LAYER_ORDER.map((layer) => (
          <TokenLayerPanel
            key={layer}
            draft={value}
            resolved={resolved}
            layer={layer}
            label={TOKEN_LAYER_LABELS[layer]}
            tokenCount={tokensByLayer[layer].length}
            onTokenChange={handleTokenChange}
          />
        ))}
      </div>
    </div>
  );
}

export { ThemeEditorPanel };
