import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { ElementRenderer } from "../../render/element-renderer";
import type { CertificateElement } from "../../schema";
import type { VariableBindings } from "../../variables";
import { snapValue } from "../state/history";
import styles from "./canvas-element.module.scss";
import { InlineTextEditor } from "./text-editor";

type DragMode =
  | {
      kind: "move";
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      kind: "resize";
      handle: string;
      startX: number;
      startY: number;
      orig: Pick<CertificateElement, "x" | "y" | "width" | "height">;
    }
  | {
      kind: "rotate";
      startAngle: number;
      origRotation: number;
      cx: number;
      cy: number;
    };

type CanvasElementProps = {
  element: CertificateElement;
  selected: boolean;
  editing: boolean;
  bindings: VariableBindings;
  snap: boolean;
  gridSize: number;
  zoom: number;
  onSelect: () => void;
  onChange: (patch: Partial<CertificateElement>, live?: boolean) => void;
  onBeginGesture?: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
};

const HANDLES = ["nw", "ne", "sw", "se"] as const;

export function CanvasElement({
  element,
  selected,
  editing,
  bindings,
  snap,
  gridSize,
  zoom,
  onSelect,
  onChange,
  onBeginGesture,
  onStartEdit,
  onStopEdit,
}: CanvasElementProps) {
  const [drag, setDrag] = useState<DragMode | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const onPointerDownMove = useCallback(
    (event: ReactPointerEvent) => {
      if (element.locked || editing) return;
      event.stopPropagation();
      onSelect();
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      onBeginGesture?.();
      setDrag({
        kind: "move",
        startX: event.clientX,
        startY: event.clientY,
        origX: element.x,
        origY: element.y,
      });
    },
    [element.locked, element.x, element.y, editing, onSelect, onBeginGesture],
  );

  const onPointerDownResize = useCallback(
    (handle: string, event: ReactPointerEvent) => {
      if (element.locked) return;
      event.stopPropagation();
      onSelect();
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      onBeginGesture?.();
      setDrag({
        kind: "resize",
        handle,
        startX: event.clientX,
        startY: event.clientY,
        orig: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        },
      });
    },
    [element, onSelect, onBeginGesture],
  );

  const onPointerDownRotate = useCallback(
    (event: ReactPointerEvent) => {
      if (element.locked) return;
      event.stopPropagation();
      onSelect();
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      onBeginGesture?.();
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      const rect = rootRef.current?.parentElement?.getBoundingClientRect();
      const pageX = rect ? (event.clientX - rect.left) / zoom : event.clientX;
      const pageY = rect ? (event.clientY - rect.top) / zoom : event.clientY;
      const startAngle = (Math.atan2(pageY - cy, pageX - cx) * 180) / Math.PI;
      setDrag({
        kind: "rotate",
        startAngle,
        origRotation: element.rotation,
        cx,
        cy,
      });
    },
    [element, onSelect, zoom, onBeginGesture],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!drag) return;

      if (drag.kind === "move") {
        const dx = (event.clientX - drag.startX) / zoom;
        const dy = (event.clientY - drag.startY) / zoom;
        onChange(
          {
            x: snapValue(drag.origX + dx, gridSize, snap),
            y: snapValue(drag.origY + dy, gridSize, snap),
          },
          true,
        );
        return;
      }

      if (drag.kind === "resize") {
        const dx = (event.clientX - drag.startX) / zoom;
        const dy = (event.clientY - drag.startY) / zoom;
        let { x, y, width, height } = drag.orig;
        if (drag.handle.includes("e")) width = drag.orig.width + dx;
        if (drag.handle.includes("s")) height = drag.orig.height + dy;
        if (drag.handle.includes("w")) {
          width = drag.orig.width - dx;
          x = drag.orig.x + dx;
        }
        if (drag.handle.includes("n")) {
          height = drag.orig.height - dy;
          y = drag.orig.y + dy;
        }
        width = Math.max(24, width);
        height = Math.max(16, height);
        onChange(
          {
            x: snapValue(x, gridSize, snap),
            y: snapValue(y, gridSize, snap),
            width: snapValue(width, gridSize, snap),
            height: snapValue(height, gridSize, snap),
          },
          true,
        );
        return;
      }

      const rect = rootRef.current?.parentElement?.getBoundingClientRect();
      const pageX = rect ? (event.clientX - rect.left) / zoom : event.clientX;
      const pageY = rect ? (event.clientY - rect.top) / zoom : event.clientY;
      const angle =
        (Math.atan2(pageY - drag.cy, pageX - drag.cx) * 180) / Math.PI;
      const rotation = Math.round(
        drag.origRotation + (angle - drag.startAngle),
      );
      onChange({ rotation }, true);
    },
    [drag, gridSize, onChange, snap, zoom],
  );

  const onPointerUp = useCallback(() => {
    setDrag(null);
  }, []);

  const editingText = editing && element.type === "text";

  return (
    // biome-ignore lint/a11y/useSemanticElements: draggable canvas element with pointer events
    <div
      ref={rootRef}
      role="group"
      tabIndex={element.locked ? -1 : 0}
      className={[
        styles.root,
        selected ? styles.selected : "",
        element.locked ? styles.locked : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation
          ? `rotate(${element.rotation}deg)`
          : undefined,
        zIndex: element.zIndex + (selected ? 1000 : 0),
      }}
      onPointerDown={onPointerDownMove}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (element.type === "text" && !element.locked) onStartEdit();
      }}
      data-element-id={element.id}
    >
      {editingText ? (
        <div
          className={styles.editOverlay}
          style={{
            transform: element.rotation
              ? `rotate(${-element.rotation}deg)`
              : undefined,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <InlineTextEditor
            content={element.content}
            onChange={(content) =>
              onChange({ content } as Partial<CertificateElement>)
            }
            onBlur={onStopEdit}
          />
        </div>
      ) : (
        <div className={styles.content} aria-hidden>
          <ElementRenderer
            element={{ ...element, x: 0, y: 0, rotation: 0 }}
            bindings={bindings}
            interactive
          />
        </div>
      )}

      {selected && !editing ? (
        <>
          {HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              className={[styles.handle, styles[handle]].join(" ")}
              aria-label={`Resize ${handle}`}
              onPointerDown={(event) => onPointerDownResize(handle, event)}
            />
          ))}
          <button
            type="button"
            className={styles.rotateHandle}
            aria-label="Rotate"
            onPointerDown={onPointerDownRotate}
          />
        </>
      ) : null}
    </div>
  );
}
