import { Tree, TreeItem, TreeItemContent } from "@dev-ui/components/tree";

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

type TreePlaygroundProps = {
  "aria-label"?: string;
  selectionMode?: "none" | "single" | "multiple";
  useCollection?: boolean;
  defaultExpandedKeys?: string[];
};

export default function TreePlayground({
  "aria-label": ariaLabel = "Files",
  selectionMode = "none",
  useCollection = false,
  defaultExpandedKeys = ["1"],
}: TreePlaygroundProps = {}) {
  return useCollection ? (
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
  );
}
