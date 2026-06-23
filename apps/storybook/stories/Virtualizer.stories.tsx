import { Virtualizer } from "@dev-ui/components/virtualizer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

const ITEM_COUNT = 100;
const LIST_HEIGHT = 240;

type VirtualizerStoryArgs = {
  "aria-label": string;
};

function VirtualizerDemo({ "aria-label": ariaLabel }: VirtualizerStoryArgs) {
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

const meta = {
  title: "Components/Virtualizer",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
  },
  args: {
    "aria-label": "Virtual list",
  },
  render: (args) => <VirtualizerDemo {...args} />,
} satisfies Meta<VirtualizerStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
