import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";
import type { Meta, StoryObj } from "@storybook/react-vite";

type DialogStoryArgs = {
  defaultOpen: boolean;
  title: string;
  description: string;
  bodyText: string;
  showCloseButton: boolean;
  showFooter: boolean;
};

const meta = {
  title: "Components/Dialog",
  tags: ["ai-generated"],
  argTypes: {
    defaultOpen: { control: "boolean" },
    title: { control: "text" },
    description: { control: "text" },
    bodyText: { control: "text" },
    showCloseButton: { control: "boolean" },
    showFooter: { control: "boolean" },
  },
  args: {
    defaultOpen: false,
    title: "Edit profile",
    description:
      "Make changes to your profile here. Click save when you are done.",
    bodyText: "Dialog body content goes here.",
    showCloseButton: true,
    showFooter: true,
  },
  render: ({
    defaultOpen,
    title,
    description,
    bodyText,
    showCloseButton,
    showFooter,
  }) => (
    <Dialog defaultOpen={defaultOpen}>
      <Button>Open dialog</Button>
      <Modal>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{bodyText}</p>
          </DialogBody>
          {showFooter ? (
            <DialogFooter>
              <Button variant="quiet">Cancel</Button>
              <Button variant="primary">Save changes</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Modal>
    </Dialog>
  ),
} satisfies Meta<DialogStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Controlled: Story = {
  args: {
    defaultOpen: true,
    title: "Controlled dialog",
    description: "This dialog opens by default for preview.",
    bodyText: "Use isOpen and onOpenChange for controlled state.",
    showFooter: false,
    showCloseButton: false,
  },
};
