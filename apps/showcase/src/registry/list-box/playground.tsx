import { ListBox, ListBoxItem } from "@dev-ui/components/list-box";

type ListBoxPlaygroundProps = {
  "aria-label"?: string;
  selectionMode?: "single" | "multiple" | "none";
  defaultSelectedKeys?: string[];
  disallowEmptySelection?: boolean;
};

export default function ListBoxPlayground({
  "aria-label": ariaLabel = "Countries",
  selectionMode = "single",
  defaultSelectedKeys = ["us"],
  disallowEmptySelection = false,
}: ListBoxPlaygroundProps = {}) {
  return (
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
  );
}
