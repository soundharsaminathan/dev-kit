import { Radio, RadioGroup } from "@dev-ui/components/radio-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  tags: ["ai-generated"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    defaultValue: {
      control: "select",
      options: ["free", "pro", "enterprise"],
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isRequired: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  render: (args) => (
    <RadioGroup {...args}>
      <Radio value="free">Free</Radio>
      <Radio value="pro">Pro</Radio>
      <Radio value="enterprise">Enterprise</Radio>
    </RadioGroup>
  ),
  args: {
    label: "Plan",
    defaultValue: "free",
    orientation: "vertical",
    isDisabled: false,
    isInvalid: false,
  },
} satisfies Meta<typeof RadioGroup>;

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
