import { Button } from "@dev-ui/components/button";
import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

type DrawerStoryArgs = {
  placement: "top" | "bottom" | "left" | "right";
  title: string;
  body: string;
};

const meta = {
  title: "Components/Drawer",
  tags: ["ai-generated"],
  argTypes: {
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
    title: { control: "text" },
    body: { control: "text" },
  },
  args: {
    placement: "bottom",
    title: "Drawer title",
    body: "Swipe down or click outside to dismiss.",
  },
  render: function DrawerDemo({ placement, title, body }) {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <Drawer isOpen={open} onOpenChange={setOpen} placement={placement}>
          <DrawerHandle />
          <div
            style={{
              padding: 24,
              width:
                placement === "left" || placement === "right" ? 280 : undefined,
            }}
          >
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <p>{body}</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </Drawer>
      </>
    );
  },
} satisfies Meta<DrawerStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LeftPlacement: Story = {
  args: {
    placement: "left",
    title: "Left drawer",
    body: "Left drawer panel",
  },
};
