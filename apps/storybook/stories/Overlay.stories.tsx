import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Overlay } from "@dev-ui/components/overlay";
import type { Meta, StoryObj } from "@storybook/react-vite";

type OverlayStoryArgs = {
  type: "modal" | "popover" | "drawer";
  mobileType: "modal" | "popover" | "drawer" | null;
  title: string;
  description: string;
  body: string;
};

const meta = {
  title: "Components/Overlay",
  tags: ["ai-generated"],
  argTypes: {
    type: {
      control: "select",
      options: ["modal", "popover", "drawer"],
    },
    mobileType: {
      control: "select",
      options: ["modal", "popover", "drawer", null],
    },
    title: { control: "text" },
    description: { control: "text" },
    body: { control: "text" },
  },
  args: {
    type: "modal",
    mobileType: "drawer",
    title: "Overlay title",
    description: "This overlay adapts based on screen size.",
    body: "Overlay content goes here.",
  },
  render: ({ type, mobileType, title, description, body }) => (
    <Dialog defaultOpen>
      <Button>Open overlay</Button>
      <Overlay type={type} mobileType={mobileType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{body}</p>
          </DialogBody>
        </DialogContent>
      </Overlay>
    </Dialog>
  ),
} satisfies Meta<OverlayStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Drawer: Story = {
  args: {
    type: "drawer",
    mobileType: "drawer",
    title: "Drawer overlay",
    description: "Rendered as a drawer panel.",
  },
};

export const Popover: Story = {
  args: {
    type: "popover",
    mobileType: "drawer",
    title: "Popover overlay",
    description: "Rendered as a popover on desktop.",
  },
};
