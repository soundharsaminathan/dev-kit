import type { DragAndDropOptions } from "@dev-ui/components/drag-and-drop";
import { useDragAndDrop } from "@dev-ui/components/drag-and-drop";
import type { CollectionItem } from "@dev-ui/components/list-box";
import { ListBox } from "@dev-ui/components/list-box";
import { useCallback, useMemo, useState } from "react";

type Key = string | number;
type ReorderEvent = Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0];

const INITIAL_ITEMS: CollectionItem[] = [
  { id: 1, label: "Documents" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Videos" },
  { id: 4, label: "Music" },
];

function moveItems(
  items: CollectionItem[],
  targetKey: Key,
  keys: Set<Key>,
  position: "before" | "after",
): CollectionItem[] {
  const moving = [...keys]
    .map((key) => items.find((item) => item.id === key))
    .filter((item): item is CollectionItem => item !== undefined);
  const remaining = items.filter((item) => !keys.has(item.id));
  const targetIndex = remaining.findIndex((item) => item.id === targetKey);

  if (targetIndex === -1) {
    return items;
  }

  const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
  remaining.splice(insertIndex, 0, ...moving);
  return remaining;
}

type DragAndDropPlaygroundProps = {
  "aria-label"?: string;
};

export default function DragAndDropPlayground({
  "aria-label": ariaLabel = "Reorderable files",
}: DragAndDropPlaygroundProps = {}) {
  const [items, setItems] = useState(INITIAL_ITEMS);

  const getItems = useCallback(
    (keys: Set<Key>) =>
      [...keys].map((key) => ({
        "text/plain":
          items.find((item) => item.id === key)?.label?.toString() ?? "",
      })),
    [items],
  );

  const onReorder = useCallback((event: ReorderEvent) => {
    if (event.target.dropPosition === "before") {
      setItems((current) =>
        moveItems(current, event.target.key, event.keys, "before"),
      );
    } else if (event.target.dropPosition === "after") {
      setItems((current) =>
        moveItems(current, event.target.key, event.keys, "after"),
      );
    }
  }, []);

  const dragAndDropOptions = useMemo(
    () => ({
      getItems,
      onReorder,
    }),
    [getItems, onReorder],
  );

  const { dragAndDropHooks } = useDragAndDrop(dragAndDropOptions);

  return (
    <div style={{ width: 280 }}>
      <ListBox
        aria-label={ariaLabel}
        selectionMode="multiple"
        items={items}
        dragAndDropHooks={dragAndDropHooks}
      />
    </div>
  );
}
