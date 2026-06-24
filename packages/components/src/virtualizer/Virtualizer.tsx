import { cn, composeRefs } from "@dev-ui/core";
import { ListLayout } from "@react-stately/layout";
import { useListState } from "@react-stately/list";
import { Rect, Size, useVirtualizerState } from "@react-stately/virtualizer";
import type { Node } from "@react-types/shared";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  type CollectionItem,
  getCollectionChild,
  getDisabledKeys,
} from "../list-box/collection-utils";
import styles from "./virtualizer.module.scss";
import type { VirtualizerProps } from "./virtualizer.types";

function Virtualizer<T extends CollectionItem>({
  ref,
  items,
  height,
  rowHeight = 40,
  selectionMode = "none",
  className,
  renderItem,
  layoutOptions,
  ...props
}: VirtualizerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<Size | null>(null);
  const visibleRectRef = useRef<Rect | null>(null);
  const itemsList = useMemo(() => [...items], [items]);
  const listState = useListState({
    ...props,
    items: itemsList as Iterable<T>,
    selectionMode,
    children: getCollectionChild,
    disabledKeys: getDisabledKeys(itemsList),
  });

  const layout = useMemo(
    () => new ListLayout({ rowHeight, ...layoutOptions }),
    [rowHeight, layoutOptions],
  );

  const onVisibleRectChange = useCallback((rect: Rect) => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    if (element.scrollLeft !== rect.x) {
      element.scrollLeft = rect.x;
    }
    if (element.scrollTop !== rect.y) {
      element.scrollTop = rect.y;
    }
  }, []);

  const { setSize, setVisibleRect, visibleViews, contentSize } =
    useVirtualizerState({
      collection: listState.collection,
      layout,
      renderView: useCallback(
        (_type: string, content: Node<CollectionItem> | null) =>
          content?.rendered ?? null,
        [],
      ),
      onVisibleRectChange,
    });

  const syncLayout = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const viewportWidth =
      element.clientWidth > 0 ? element.clientWidth : element.offsetWidth || 1;

    const nextSize = new Size(viewportWidth, height);
    const nextRect = new Rect(
      element.scrollLeft,
      element.scrollTop,
      viewportWidth,
      height,
    );

    if (!sizeRef.current?.equals(nextSize)) {
      sizeRef.current = nextSize;
      setSize(nextSize);
    }
    if (!visibleRectRef.current?.equals(nextRect)) {
      visibleRectRef.current = nextRect;
      setVisibleRect(nextRect);
    }
  }, [height, setSize, setVisibleRect]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: remeasure when container height changes
  useLayoutEffect(() => {
    syncLayout();
  }, [height, syncLayout]);

  return (
    <div
      ref={composeRefs(scrollRef, ref)}
      data-virtualizer=""
      className={cn(styles.root, className)}
      style={{ height }}
      onScroll={syncLayout}
      role="listbox"
      aria-label={props["aria-label"]}
    >
      <div className={styles.content} style={{ height: contentSize.height }}>
        {visibleViews.map((view) => {
          const node = view.content;
          if (node?.type !== "item") {
            return null;
          }
          const item = node.value as T;
          const layoutInfo = view.layoutInfo;
          if (!layoutInfo) {
            return null;
          }
          const { rect } = layoutInfo;
          return (
            <div
              key={String(node.key)}
              data-virtualizer-item=""
              className={styles.item}
              style={{
                top: rect.y,
                left: rect.x,
                width: rect.width,
                height: rect.height,
              }}
            >
              {renderItem ? renderItem(item) : item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { VirtualizerProps } from "./virtualizer.types";
export { Virtualizer };
