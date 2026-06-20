import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "danger", "warning", "info", "success"],
    },
  },
  args: {
    variant: "neutral",
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version is ready to install.</AlertDescription>
    </Alert>
  ),
};

export const Danger: Story = {
  args: { variant: "danger" },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription>
        Check your card details and try again.
      </AlertDescription>
    </Alert>
  ),
};
