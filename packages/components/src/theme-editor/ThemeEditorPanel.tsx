import { cn } from "@dev-ui/core";
import { getBuiltInThemeIds } from "@dev-ui/tokens";
import { Input } from "../input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../select/Select";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorPanelProps } from "./theme-editor.types";

function ThemeEditorPanel({
  value,
  onChange,
  className,
}: ThemeEditorPanelProps) {
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
    </div>
  );
}

export { ThemeEditorPanel };
