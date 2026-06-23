import { GridList, GridListItem } from "@dev-ui/components/grid-list";

type GridListPlaygroundProps = {
  "aria-label"?: string;
  selectionMode?: "single" | "multiple" | "none";
};

export default function GridListPlayground({
  "aria-label": ariaLabel = "Files",
  selectionMode = "single",
}: GridListPlaygroundProps = {}) {
  return (
    <GridList
      aria-label={ariaLabel}
      selectionMode={selectionMode}
      defaultSelectedKeys={["documents"]}
    >
      <GridListItem id="documents">Documents</GridListItem>
      <GridListItem id="photos">Photos</GridListItem>
      <GridListItem id="videos">Videos</GridListItem>
    </GridList>
  );
}
