import { Label } from "@dev-ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";
import type { Meta, StoryObj } from "@storybook/react-vite";

type SelectStoryArgs = {
  placeholder: string;
  label: string;
  description: string;
  errorMessage: string;
  labelMode: "prop" | "element";
  defaultSelectedKey: "none" | "perplexity" | "replicate" | "together-ai";
  isDisabled: boolean;
  isRequired: boolean;
  isInvalid: boolean;
};

const meta = {
  title: "Components/Select",
  tags: ["ai-generated"],
  argTypes: {
    placeholder: { control: "text" },
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    labelMode: {
      control: "select",
      options: ["prop", "element"],
    },
    defaultSelectedKey: {
      control: "select",
      options: ["none", "perplexity", "replicate", "together-ai"],
    },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  args: {
    placeholder: "Select a provider",
    label: "Provider",
    labelMode: "element",
    description: "",
    errorMessage: "",
    defaultSelectedKey: "none",
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
  },
  render: ({
    labelMode,
    label,
    placeholder,
    description,
    errorMessage,
    defaultSelectedKey,
    isDisabled,
    isRequired,
    isInvalid,
  }) => (
    <Select
      label={labelMode === "prop" ? label : undefined}
      placeholder={placeholder}
      description={description || undefined}
      errorMessage={errorMessage || undefined}
      {...(defaultSelectedKey !== "none" ? { defaultSelectedKey } : {})}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      {labelMode === "element" ? <Label>{label}</Label> : null}
      <SelectTrigger />
      <SelectContent>
        <SelectItem id="perplexity">Perplexity</SelectItem>
        <SelectItem id="replicate">Replicate</SelectItem>
        <SelectItem id="together-ai">Together AI</SelectItem>
      </SelectContent>
    </Select>
  ),
} satisfies Meta<SelectStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabelProp: Story = {
  args: {
    labelMode: "prop",
  },
};
