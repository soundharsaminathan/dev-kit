import { Button } from "@dev-ui/components/button";
import { Toolbar } from "@dev-ui/components/toolbar";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ToolbarStoryArgs = {
  "aria-label": string;
  orientation: "horizontal" | "vertical";
};

const meta = {
  title: "Components/Toolbar",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
  args: {
    "aria-label": "Formatting",
    orientation: "horizontal",
  },
  render: ({ "aria-label": ariaLabel, orientation }) => (
    <Toolbar aria-label={ariaLabel} orientation={orientation}>
      <Button variant="quiet">Bold</Button>
      <Button variant="quiet">Italic</Button>
      <Button variant="quiet">Underline</Button>
    </Toolbar>
  ),
} satisfies Meta<ToolbarStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
