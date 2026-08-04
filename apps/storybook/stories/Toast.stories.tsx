import { Button } from "@dev-ui/components/button";
import type { ToastPosition, ToastVariant } from "@dev-ui/components/toast";
import { ToastProvider, useToastContext } from "@dev-ui/components/toast";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ToastStoryArgs = {
  title: string;
  description: string;
  variant: ToastVariant;
  position: ToastPosition;
  timeout: number;
  showAction: boolean;
  actionLabel: string;
};

function ToastDemo({
  title,
  description,
  variant,
  timeout,
  showAction,
  actionLabel,
}: ToastStoryArgs) {
  const { toast } = useToastContext("ToastDemo");

  return (
    <Button
      onClick={() =>
        toast(
          {
            title,
            description,
            variant,
            ...(showAction
              ? {
                  action: {
                    label: actionLabel,
                    onPress: () => undefined,
                  },
                }
              : {}),
          },
          { timeout },
        )
      }
    >
      Show toast
    </Button>
  );
}

function StackedToastDemo() {
  const { toast } = useToastContext("StackedToastDemo");

  return (
    <Button
      onClick={() => {
        toast(
          {
            title: "Message sent",
            description: "Your message was delivered.",
            variant: "success",
          },
          { timeout: 8000 },
        );
        toast(
          {
            title: "Invite pending",
            description: "Waiting for a response.",
            variant: "info",
          },
          { timeout: 8000 },
        );
        toast(
          {
            title: "Storage almost full",
            description: "Free up space to keep uploading.",
            variant: "warning",
            action: {
              label: "View",
              onPress: () => undefined,
            },
          },
          { timeout: 8000 },
        );
        toast(
          {
            title: "Queued behind the stack",
            description: "Appears when a slot opens.",
            variant: "neutral",
          },
          { timeout: 8000 },
        );
      }}
    >
      Show stacked toasts
    </Button>
  );
}

const defaultToastArgs: ToastStoryArgs = {
  title: "Files uploaded",
  description: "3 files uploaded successfully.",
  variant: "neutral",
  position: "top-right",
  timeout: 3000,
  showAction: false,
  actionLabel: "Install",
};

const meta = {
  title: "Components/Toast",
  tags: ["ai-generated"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    variant: {
      control: "select",
      options: ["neutral", "success", "error", "warning", "info", "loading"],
    },
    position: {
      control: "select",
      options: [
        "top-left",
        "top-center",
        "top-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ],
    },
    timeout: { control: "number" },
    showAction: { control: "boolean" },
    actionLabel: { control: "text" },
  },
  args: defaultToastArgs,
  decorators: [
    (Story, { args }) => (
      <ToastProvider position={args.position as ToastPosition}>
        <Story />
      </ToastProvider>
    ),
  ],
  render: (args) => <ToastDemo {...defaultToastArgs} {...args} />,
} satisfies Meta<ToastStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = {
  args: {
    title: "Profile updated",
    description: "Your profile changes are live.",
    variant: "success",
  },
};

export const ErrorToast: Story = {
  args: {
    title: "Upload failed",
    description: "Check your connection and try again.",
    variant: "error",
    showAction: true,
    actionLabel: "Retry",
  },
};

export const Warning: Story = {
  args: {
    title: "Unsaved changes",
    description: "Leaving now will discard your edits.",
    variant: "warning",
  },
};

export const Info: Story = {
  args: {
    title: "New feature",
    description: "Batch chat reactions are available.",
    variant: "info",
  },
};

export const WithAction: Story = {
  args: {
    title: "Item deleted",
    description: "You can restore it for a short time.",
    variant: "neutral",
    showAction: true,
    actionLabel: "Undo",
  },
};

export const Loading: Story = {
  args: {
    title: "Processing",
    description: "This may take a moment.",
    variant: "loading",
  },
};

export const TopCenter: Story = {
  args: {
    title: "Signed out",
    description: "",
    variant: "warning",
    position: "top-center",
  },
};

export const Stacked: Story = {
  render: () => <StackedToastDemo />,
};
