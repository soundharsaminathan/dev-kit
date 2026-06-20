import { ListBox, ListBoxItem } from "@dev-ui/components/list-box";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ListBoxStoryArgs = {
  "aria-label": string;
  selectionMode: "single" | "multiple" | "none";
  defaultSelectedKeys: string[];
  disallowEmptySelection: boolean;
};

const meta = {
  title: "Components/ListBox",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    selectionMode: {
      control: "select",
      options: ["single", "multiple", "none"],
    },
    defaultSelectedKeys: { control: "object" },
    disallowEmptySelection: { control: "boolean" },
  },
  args: {
    "aria-label": "Countries",
    selectionMode: "single",
    defaultSelectedKeys: ["us"],
    disallowEmptySelection: false,
  },
  render: ({
    "aria-label": ariaLabel,
    selectionMode,
    defaultSelectedKeys,
    disallowEmptySelection,
  }) => (
    <ListBox
      aria-label={ariaLabel}
      selectionMode={selectionMode}
      defaultSelectedKeys={defaultSelectedKeys}
      disallowEmptySelection={disallowEmptySelection}
    >
      <ListBoxItem id="us">United States</ListBoxItem>
      <ListBoxItem id="ca">Canada</ListBoxItem>
      <ListBoxItem id="uk">United Kingdom</ListBoxItem>
    </ListBox>
  ),
} satisfies Meta<ListBoxStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  args: {
    "aria-label": "Tags",
    selectionMode: "multiple",
    defaultSelectedKeys: ["news"],
  },
};
