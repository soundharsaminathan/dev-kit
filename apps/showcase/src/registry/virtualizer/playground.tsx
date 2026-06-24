import { Virtualizer } from "@dev-ui/components/virtualizer";
import { useMemo } from "react";

type VirtualizerPlaygroundProps = {
  "aria-label"?: string;
};

const ITEM_COUNT = 100;
const LIST_HEIGHT = 240;

export default function VirtualizerPlayground({
  "aria-label": ariaLabel = "Virtual list",
}: VirtualizerPlaygroundProps = {}) {
  const items = useMemo(
    () =>
      Array.from({ length: ITEM_COUNT }, (_, index) => ({
        id: `item-${index + 1}`,
        label: `Item ${index + 1}`,
      })),
    [],
  );

  return (
    <Virtualizer aria-label={ariaLabel} items={items} height={LIST_HEIGHT} />
  );
}
