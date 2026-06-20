import { Button } from "@dev-ui/components/button";
import { Tooltip, TooltipContent } from "@dev-ui/components/tooltip";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";

type TooltipStoryArgs = {
  triggerLabel: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  fullWidth: boolean;
  touchBehavior: "toggle" | "longPress";
  delay: number;
  closeDelay: number;
};

const TooltipContentWithPlacement = TooltipContent as React.FC<{
  placement?: TooltipStoryArgs["placement"];
  children?: React.ReactNode;
}>;

const meta = {
  title: "Components/Tooltip",
  tags: ["ai-generated"],
  argTypes: {
    triggerLabel: { control: "text" },
    content: { control: "text" },
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
    fullWidth: { control: "boolean" },
    touchBehavior: {
      control: "select",
      options: ["toggle", "longPress"],
    },
    delay: { control: "number" },
    closeDelay: { control: "number" },
  },
  args: {
    triggerLabel: "Hover or tap me",
    content: "Add to library",
    placement: "bottom",
    fullWidth: true,
    touchBehavior: "toggle",
    delay: 0,
    closeDelay: 0,
  },
  render: ({
    triggerLabel,
    content,
    placement,
    fullWidth,
    touchBehavior,
    delay,
    closeDelay,
  }) => (
    <div style={{ width: fullWidth ? 280 : undefined }}>
      <Tooltip
        fullWidth={fullWidth}
        touchBehavior={touchBehavior}
        delay={delay}
        closeDelay={closeDelay}
      >
        <Button>{triggerLabel}</Button>
        <TooltipContentWithPlacement placement={placement}>
          {content}
        </TooltipContentWithPlacement>
      </Tooltip>
    </div>
  ),
} satisfies Meta<TooltipStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongPressOnTouch: Story = {
  args: {
    touchBehavior: "longPress",
    triggerLabel: "Press and hold on touch",
    content: "Keeps short taps available for the button action",
    fullWidth: false,
  },
};
