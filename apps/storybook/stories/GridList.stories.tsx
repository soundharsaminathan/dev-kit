import { GridList, GridListItem } from "@dev-ui/components/grid-list";
import type { Meta, StoryObj } from "@storybook/react-vite";

type GridListStoryArgs = {
  "aria-label": string;
  selectionMode: "single" | "multiple" | "none";
};

const meta = {
  title: "Components/GridList",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    selectionMode: {
      control: "select",
      options: ["single", "multiple", "none"],
    },
  },
  args: {
    "aria-label": "Files",
    selectionMode: "single",
  },
  render: ({ "aria-label": ariaLabel, selectionMode }) => (
    <GridList
      aria-label={ariaLabel}
      selectionMode={selectionMode}
      defaultSelectedKeys={["documents"]}
    >
      <GridListItem id="documents">Documents</GridListItem>
      <GridListItem id="photos">Photos</GridListItem>
      <GridListItem id="videos">Videos</GridListItem>
    </GridList>
  ),
} satisfies Meta<GridListStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
