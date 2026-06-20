import { Description, Label } from "@dev-ui/components/field";
import { TextArea } from "@dev-ui/components/text-area";
import { TextField } from "@dev-ui/components/text-field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type TextAreaStoryArgs = {
  placeholder: string;
  "aria-label": string;
  showField: boolean;
  labelText: string;
  descriptionText: string;
  size: "sm" | "md" | "lg";
  rows: number;
  disabled: boolean;
};

const meta = {
  title: "Components/TextArea",
  tags: ["ai-generated"],
  argTypes: {
    placeholder: { control: "text" },
    "aria-label": { control: "text" },
    labelText: { control: "text" },
    descriptionText: { control: "text" },
    showField: { control: "boolean" },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    rows: { control: "number" },
    disabled: { control: "boolean" },
  },
  args: {
    placeholder: "Type your message here.",
    "aria-label": "Message",
    showField: false,
    labelText: "Message",
    descriptionText: "We never share your messages.",
    size: "md",
    rows: 4,
    disabled: false,
  },
  render: ({
    showField,
    labelText,
    descriptionText,
    placeholder,
    size,
    rows,
    disabled,
    "aria-label": ariaLabel,
  }) =>
    showField ? (
      <TextField>
        <Label>{labelText}</Label>
        <Description>{descriptionText}</Description>
        <TextArea
          placeholder={placeholder}
          size={size}
          rows={rows}
          disabled={disabled}
        />
      </TextField>
    ) : (
      <TextArea
        aria-label={ariaLabel}
        placeholder={placeholder}
        size={size}
        rows={rows}
        disabled={disabled}
      />
    ),
} satisfies Meta<TextAreaStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithField: Story = {
  args: {
    showField: true,
  },
};

export const Disabled: Story = {
  args: {
    showField: true,
    disabled: true,
  },
};
