import { Checkbox } from "@dev-ui/components/checkbox";
import { CheckboxGroup } from "@dev-ui/components/checkbox-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/CheckboxGroup",
  component: CheckboxGroup,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    defaultValue: {
      control: "check",
      options: ["email", "sms", "push"],
    },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  render: (args) => (
    <CheckboxGroup {...args}>
      <Checkbox value="email">Email</Checkbox>
      <Checkbox value="sms">SMS</Checkbox>
      <Checkbox value="push">Push notifications</Checkbox>
    </CheckboxGroup>
  ),
  args: {
    "aria-label": "Notifications",
    defaultValue: ["email"],
    isDisabled: false,
    isInvalid: false,
  },
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

export const Invalid: Story = {
  args: {
    isInvalid: true,
  },
};
