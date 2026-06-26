import { cn } from "@dev-ui/core";
import {
  COLOR_SEED_KEYS,
  getBuiltInThemeIds,
  resolveThemeDraft,
  setColorSeed,
  setTokenOverride,
  TOKEN_LAYER_LABELS,
  TOKEN_LAYER_ORDER,
  type TokenLayerKey,
} from "@dev-ui/tokens";
import { useMemo } from "react";
import { Accordion } from "../accordion/Accordion";
import { ColorEditor } from "../color-editor/ColorEditor";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "../disclosure/Disclosure";
import { Input } from "../input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../select/Select";
import { ThemeLayerPreview } from "./ThemeLayerPreview";
import { TokenLayerPanel } from "./TokenLayerPanel";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorPanelProps } from "./theme-editor.types";

function ThemeEditorPanel({
  value,
  onChange,
  className,
}: ThemeEditorPanelProps) {
  const resolved = useMemo(() => resolveThemeDraft(value), [value]);
  const tokenCountByLayer = useMemo(
    () =>
      Object.fromEntries(
        TOKEN_LAYER_ORDER.map((layer) => [
          layer,
          Object.keys(resolved.tokens[layer]).length,
        ]),
      ) as Record<TokenLayerKey, number>,
    [resolved],
  );

  const handleTokenChange = (
    layer: TokenLayerKey,
    name: string,
    rawValue: string | null,
    category: Parameters<typeof setTokenOverride>[4],
  ) => {
    onChange(setTokenOverride(value, layer, name, rawValue, category));
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
        </div>
      </div>

      <Accordion
        allowsMultipleExpanded
        defaultExpandedKeys={["theme-section-color", "theme-layer-foundation"]}
      >
        <Disclosure id="theme-section-color">
          <DisclosureTrigger>
            Color
            <span className={styles.layerCount}>
              ({COLOR_SEED_KEYS.length})
            </span>
          </DisclosureTrigger>
          <DisclosurePanel mountWhen="expanded-once">
            <ThemeLayerPreview section="color" />
            <div className={styles.tokenList}>
              {COLOR_SEED_KEYS.map((seed) => (
                <div key={seed} className={styles.seedBlock}>
                  <span className={styles.seedLabel}>{seed}</span>
                  <ColorEditor
                    value={value.color.seeds[seed] ?? "#000000"}
                    onChange={(color) =>
                      onChange(setColorSeed(value, seed, color.toString("hex")))
                    }
                  />
                </div>
              ))}
            </div>
          </DisclosurePanel>
        </Disclosure>

        {TOKEN_LAYER_ORDER.map((layer) => (
          <TokenLayerPanel
            key={layer}
            draft={value}
            resolved={resolved}
            layer={layer}
            label={TOKEN_LAYER_LABELS[layer]}
            tokenCount={tokenCountByLayer[layer]}
            onTokenChange={handleTokenChange}
            headerContent={
              layer === "foundation" ? (
                <div className={styles.seedBlock}>
                  <span className={styles.seedLabel}>Radius factor</span>
                  <Input
                    aria-label="Radius factor"
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={String(
                      value.radiusFactor ?? resolved.radiusFactor ?? 1,
                    )}
                    onChange={(event) => {
                      const parsed = Number.parseFloat(event.target.value);
                      const next = { ...value };
                      if (Number.isFinite(parsed)) {
                        next.radiusFactor = parsed;
                      } else {
                        delete next.radiusFactor;
                      }
                      onChange(next);
                    }}
                  />
                </div>
              ) : null
            }
          />
        ))}
      </Accordion>
    </div>
  );
}

export { ThemeEditorPanel };
