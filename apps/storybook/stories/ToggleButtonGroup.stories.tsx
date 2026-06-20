import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ToggleButtonGroupStoryArgs = {
  selectionMode: "single" | "multiple";
  defaultSelectedKeys: string[];
  variant: "default" | "primary" | "quiet";
  size: "xs" | "sm" | "md" | "lg";
  orientation: "horizontal" | "vertical";
  isDisabled: boolean;
  disallowEmptySelection: boolean;
};

const meta = {
  title: "Components/ToggleButtonGroup",
  tags: ["ai-generated"],
  argTypes: {
    selectionMode: {
      control: "select",
      options: ["single", "multiple"],
    },
    defaultSelectedKeys: { control: "object" },
    variant: {
      control: "select",
      options: ["default", "primary", "quiet"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    isDisabled: { control: "boolean" },
    disallowEmptySelection: { control: "boolean" },
  },
  args: {
    selectionMode: "single",
    defaultSelectedKeys: ["bold"],
    variant: "default",
    size: "md",
    orientation: "horizontal",
    isDisabled: false,
    disallowEmptySelection: false,
  },
  render: ({
    selectionMode,
    defaultSelectedKeys,
    variant,
    size,
    orientation,
    isDisabled,
    disallowEmptySelection,
  }) => (
    <ToggleButtonGroup
      selectionMode={selectionMode}
      defaultSelectedKeys={defaultSelectedKeys}
      orientation={orientation}
      isDisabled={isDisabled}
      disallowEmptySelection={disallowEmptySelection}
    >
      <ToggleButton id="bold" variant={variant} size={size}>
        Bold
      </ToggleButton>
      <ToggleButton id="italic" variant={variant} size={size}>
        Italic
      </ToggleButton>
      <ToggleButton id="underline" variant={variant} size={size}>
        Underline
      </ToggleButton>
    </ToggleButtonGroup>
  ),
} satisfies Meta<ToggleButtonGroupStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
