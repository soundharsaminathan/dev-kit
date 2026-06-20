import { Description, FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

type TextFieldStoryArgs = {
  orientation: "horizontal" | "vertical";
  label: string;
  placeholder: string;
  showDescription: boolean;
  description: string;
  showError: boolean;
  errorMessage: string;
};

const meta = {
  title: "Components/TextField",
  tags: ["ai-generated"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    label: { control: "text" },
    placeholder: { control: "text" },
    showDescription: { control: "boolean" },
    description: { control: "text" },
    showError: { control: "boolean" },
    errorMessage: { control: "text" },
  },
  args: {
    orientation: "vertical",
    label: "Email",
    placeholder: "you@example.com",
    showDescription: true,
    description: "We will send updates to this address.",
    showError: false,
    errorMessage: "Email is required",
  },
  render: ({
    orientation,
    label,
    placeholder,
    showDescription,
    description,
    showError,
    errorMessage,
  }) => (
    <TextField orientation={orientation}>
      <Label>{label}</Label>
      {showDescription ? <Description>{description}</Description> : null}
      <Input placeholder={placeholder} />
      {showError ? <FieldError>{errorMessage}</FieldError> : null}
    </TextField>
  ),
} satisfies Meta<TextFieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const field = canvas
      .getByRole("textbox")
      .closest("[data-slot='text-field']");
    await expect(field).toHaveAttribute("data-textfield", "");
  },
};

export const WithError: Story = {
  args: {
    showDescription: false,
    showError: true,
  },
};
