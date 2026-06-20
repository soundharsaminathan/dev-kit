import { Tree, TreeItem, TreeItemContent } from "@dev-ui/components/tree";
import type { Meta, StoryObj } from "@storybook/react-vite";

const items = [
  {
    id: "1",
    title: "Documents",
    children: [
      { id: "1-1", title: "Project" },
      { id: "1-2", title: "Reports" },
    ],
  },
  {
    id: "2",
    title: "Photos",
    children: [{ id: "2-1", title: "Vacation" }],
  },
];

type TreeStoryArgs = {
  "aria-label": string;
  selectionMode: "none" | "single" | "multiple";
  useCollection: boolean;
  defaultExpandedKeys: string[];
};

const meta = {
  title: "Components/Tree",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    selectionMode: {
      control: "select",
      options: ["none", "single", "multiple"],
    },
    useCollection: { control: "boolean" },
    defaultExpandedKeys: { control: "object" },
  },
  args: {
    "aria-label": "Files",
    selectionMode: "none",
    useCollection: false,
    defaultExpandedKeys: ["1"],
  },
  render: ({
    "aria-label": ariaLabel,
    selectionMode,
    useCollection,
    defaultExpandedKeys,
  }) =>
    useCollection ? (
      <Tree
        items={items}
        aria-label={ariaLabel}
        selectionMode={selectionMode}
        defaultExpandedKeys={defaultExpandedKeys}
      >
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>
    ) : (
      <Tree
        aria-label={ariaLabel}
        selectionMode={selectionMode}
        defaultExpandedKeys={defaultExpandedKeys}
      >
        <TreeItem id="1" textValue="Documents">
          Documents
          <TreeItem id="1-1" textValue="Project">
            Project
          </TreeItem>
          <TreeItem id="1-2" textValue="Reports">
            Reports
          </TreeItem>
        </TreeItem>
        <TreeItem id="2" textValue="Photos">
          Photos
          <TreeItem id="2-1" textValue="Vacation">
            Vacation
          </TreeItem>
        </TreeItem>
      </Tree>
    ),
} satisfies Meta<TreeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithItems: Story = {
  args: {
    useCollection: true,
    defaultExpandedKeys: ["1", "2"],
  },
};

export const MultipleSelection: Story = {
  args: {
    useCollection: true,
    selectionMode: "multiple",
    defaultExpandedKeys: ["1", "2"],
  },
};
