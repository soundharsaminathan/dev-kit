import type { DragAndDropOptions } from "@dev-ui/components/drag-and-drop";
import { useDragAndDrop } from "@dev-ui/components/drag-and-drop";
import type { CollectionItem } from "@dev-ui/components/list-box";
import { ListBox } from "@dev-ui/components/list-box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useMemo, useState } from "react";

type ReorderEvent = Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0];
type ItemKey = CollectionItem["id"];

const INITIAL_ITEMS: CollectionItem[] = [
  { id: 1, label: "Documents" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Videos" },
  { id: 4, label: "Music" },
];

type DragAndDropStoryArgs = {
  "aria-label": string;
};

function moveItems(
  items: CollectionItem[],
  targetKey: ItemKey,
  keys: Set<ItemKey>,
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

function ReorderableListDemo({
  "aria-label": ariaLabel,
}: DragAndDropStoryArgs) {
  const [items, setItems] = useState(INITIAL_ITEMS);

  const getItems = useCallback(
    (keys: Set<ItemKey>) =>
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

const meta = {
  title: "Components/DragAndDrop",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
  },
  args: {
    "aria-label": "Reorderable files",
  },
  render: (args) => <ReorderableListDemo {...args} />,
} satisfies Meta<DragAndDropStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
