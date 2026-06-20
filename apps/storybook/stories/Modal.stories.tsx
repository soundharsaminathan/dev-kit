import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ModalStoryArgs = {
  defaultOpen: boolean;
  isDismissable: boolean;
  showCloseButton: boolean;
  title: string;
  description: string;
  body: string;
};

const meta = {
  title: "Components/Modal",
  tags: ["ai-generated"],
  argTypes: {
    defaultOpen: { control: "boolean" },
    isDismissable: { control: "boolean" },
    showCloseButton: { control: "boolean" },
    title: { control: "text" },
    description: { control: "text" },
    body: { control: "text" },
  },
  args: {
    defaultOpen: true,
    isDismissable: true,
    showCloseButton: true,
    title: "Modal panel",
    description: "Modal provides the backdrop, viewport, and panel shell.",
    body: "Compose with Dialog subcomponents for content layout.",
  },
  render: ({
    defaultOpen,
    isDismissable,
    showCloseButton,
    title,
    description,
    body,
  }) => (
    <Dialog defaultOpen={defaultOpen}>
      <Button>Open modal</Button>
      <Modal isDismissable={isDismissable}>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{body}</p>
          </DialogBody>
        </DialogContent>
      </Modal>
    </Dialog>
  ),
} satisfies Meta<ModalStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoCloseButton: Story = {
  args: {
    showCloseButton: false,
    title: "Dismissable modal",
    description: "Click the backdrop or press Escape to close.",
    body: "",
  },
};
