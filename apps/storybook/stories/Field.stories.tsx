import {
  Description,
  Field,
  FieldError,
  Label,
} from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

type FieldStoryArgs = {
  orientation: "horizontal" | "vertical";
  labelText: string;
  descriptionText: string;
  placeholder: string;
  errorMessage: string;
  showError: boolean;
};

const meta = {
  title: "Components/Field",
  tags: ["ai-generated"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    labelText: { control: "text" },
    descriptionText: { control: "text" },
    placeholder: { control: "text" },
    errorMessage: { control: "text" },
    showError: { control: "boolean" },
  },
  args: {
    orientation: "vertical",
    labelText: "Email",
    descriptionText: "We will send updates to this address.",
    placeholder: "you@example.com",
    errorMessage: "Email is required",
    showError: false,
  },
  render: ({
    orientation,
    labelText,
    descriptionText,
    placeholder,
    errorMessage,
    showError,
  }) => (
    <Field orientation={orientation}>
      <Label>{labelText}</Label>
      {showError ? null : <Description>{descriptionText}</Description>}
      <Input placeholder={placeholder} />
      {showError ? <FieldError>{errorMessage}</FieldError> : null}
    </Field>
  ),
} satisfies Meta<FieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox");
    await expect(input).toHaveAttribute("data-input-control", "");
  },
};

export const WithError: Story = {
  args: {
    showError: true,
  },
};
