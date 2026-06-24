import { OverlayArrow } from "@dev-ui/components/overlay-arrow";
import type { Meta, StoryObj } from "@storybook/react-vite";

type OverlayArrowStoryArgs = {
  placement: "top" | "bottom" | "left" | "right";
};

const meta = {
  title: "Components/OverlayArrow",
  tags: ["ai-generated"],
  argTypes: {
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
  },
  args: {
    placement: "bottom",
  },
  render: ({ placement }) => (
    <div
      style={{
        position: "relative",
        width: 200,
        height: 120,
        margin: 24,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        background: "var(--color-surface)",
      }}
    >
      <OverlayArrow placement={placement} />
    </div>
  ),
} satisfies Meta<OverlayArrowStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
