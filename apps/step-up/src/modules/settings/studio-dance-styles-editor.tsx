import type { DanceStyle } from "@/lib/dance-styles";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import page from "./studio-dance-styles-form-page.module.scss";

type DanceStylesEditorProps = {
  styles: DanceStyle[];
  busy?: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<DanceStyle>) => void;
};

export function DanceStylesEditor({
  styles,
  busy = false,
  onAdd,
  onRemove,
  onMove,
  onUpdate,
}: DanceStylesEditorProps) {
  return (
    <div className={page.root}>
      <div className={page.toolbar}>
        <TouchButton variant="quiet" onClick={onAdd} disabled={busy}>
          Add style
        </TouchButton>
      </div>

      {styles.length === 0 ? (
        <EmptyState
          title="No dance styles yet"
          description="Add the styles students and trainers can choose from."
          action={
            <TouchButton variant="primary" onClick={onAdd}>
              Add style
            </TouchButton>
          }
        />
      ) : null}

      {styles.map((style, index) => (
        <div key={style.id} className={page.styleCard}>
          <div className={page.styleHeader}>
            <span className={page.stylePreview}>
              <span
                className={page.previewSwatch}
                style={{ background: style.color }}
              >
                {style.abbrev || "?"}
              </span>
              <span aria-hidden="true">{style.emoji}</span>
              <span>{style.label || "Untitled"}</span>
            </span>
            <div className={staff.rowActions}>
              <TouchButton
                variant="quiet"
                onClick={() => onMove(style.id, -1)}
                disabled={busy || index === 0}
              >
                Up
              </TouchButton>
              <TouchButton
                variant="quiet"
                onClick={() => onMove(style.id, 1)}
                disabled={busy || index === styles.length - 1}
              >
                Down
              </TouchButton>
              <TouchButton
                variant="quiet"
                onClick={() => onRemove(style.id)}
                disabled={busy}
              >
                Remove
              </TouchButton>
            </div>
          </div>

          <div className={page.fields}>
            <FormInput
              label="Name"
              value={style.label}
              onChange={(value) => onUpdate(style.id, { label: value })}
            />
            <div className={page.inlineFields}>
              <FormInput
                label="Abbreviation"
                value={style.abbrev}
                maxLength={4}
                onChange={(value) =>
                  onUpdate(style.id, {
                    abbrev: value.toUpperCase().slice(0, 4),
                  })
                }
              />
              <FormInput
                label="Emoji"
                value={style.emoji}
                onChange={(value) => onUpdate(style.id, { emoji: value })}
              />
              <div className={page.colorField}>
                <span className={page.colorLabel}>Color</span>
                <div className={page.colorRow}>
                  <input
                    className={page.colorInput}
                    type="color"
                    value={
                      /^#([0-9a-fA-F]{6})$/.test(style.color)
                        ? style.color
                        : "#E4572E"
                    }
                    aria-label={`${style.label || "Style"} color`}
                    onChange={(event) =>
                      onUpdate(style.id, {
                        color: event.target.value.toUpperCase(),
                      })
                    }
                  />
                  <FormInput
                    label="Hex"
                    aria-label={`${style.label || "Style"} hex color`}
                    value={style.color}
                    onChange={(value) => onUpdate(style.id, { color: value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
