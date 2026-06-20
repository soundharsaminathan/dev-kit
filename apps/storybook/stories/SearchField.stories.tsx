import { Label } from "@dev-ui/components/field";
import {
  SearchField,
  SearchFieldClear,
  SearchFieldGroup,
  SearchFieldInput,
} from "@dev-ui/components/search-field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type SearchFieldStoryArgs = {
  "aria-label": string;
  placeholder: string;
  isDisabled: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  showLabel: boolean;
  labelText: string;
};

const meta = {
  title: "Components/SearchField",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    placeholder: { control: "text" },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    showLabel: { control: "boolean" },
    labelText: { control: "text" },
  },
  args: {
    "aria-label": "Search",
    placeholder: "Search...",
    isDisabled: false,
    isRequired: false,
    isReadOnly: false,
    showLabel: false,
    labelText: "Search",
  },
  render: ({ showLabel, labelText, placeholder, ...props }) =>
    showLabel ? (
      <SearchField {...props}>
        <Label>{labelText}</Label>
        <SearchFieldGroup>
          <SearchFieldInput placeholder={placeholder} />
          <SearchFieldClear />
        </SearchFieldGroup>
      </SearchField>
    ) : (
      <SearchField {...props} placeholder={placeholder} />
    ),
} satisfies Meta<SearchFieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    showLabel: true,
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
