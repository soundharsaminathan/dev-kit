import { Input } from "@dev-ui/components/input";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

type InputGroupStoryArgs = {
  size: "sm" | "md" | "lg";
  isDisabled: boolean;
  isInvalid: boolean;
  addonPosition: "leading" | "trailing";
  addonText: string;
  placeholder: string;
  ariaLabel: string;
};

const meta = {
  title: "Components/InputGroup",
  tags: ["ai-generated"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    addonPosition: {
      control: "select",
      options: ["leading", "trailing"],
    },
    addonText: { control: "text" },
    placeholder: { control: "text" },
    ariaLabel: { control: "text" },
  },
  args: {
    size: "md",
    isDisabled: false,
    isInvalid: false,
    addonPosition: "leading",
    addonText: "https://",
    placeholder: "example.com",
    ariaLabel: "Website",
  },
  render: ({
    size,
    isDisabled,
    isInvalid,
    addonPosition,
    addonText,
    placeholder,
    ariaLabel,
  }) => (
    <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid}>
      {addonPosition === "leading" ? (
        <InputGroupAddon>{addonText}</InputGroupAddon>
      ) : null}
      <Input placeholder={placeholder} aria-label={ariaLabel} />
      {addonPosition === "trailing" ? (
        <InputGroupAddon>{addonText}</InputGroupAddon>
      ) : null}
    </InputGroup>
  ),
} satisfies Meta<InputGroupStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTrailingAddon: Story = {
  args: {
    addonPosition: "trailing",
    addonText: ".com",
    placeholder: "Search",
    ariaLabel: "Search",
  },
};
