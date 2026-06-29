import { ListBox, ListBoxItem } from "@dev-ui/components/list-box";

type ListBoxPlaygroundProps = {
  "aria-label"?: string;
  selectionMode?: "single" | "multiple" | "none";
  defaultSelectedKeys?: string | string[];
  disallowEmptySelection?: boolean;
};

export default function ListBoxPlayground({
  "aria-label": ariaLabel = "Countries",
  selectionMode = "single",
  defaultSelectedKeys: defaultSelectedKeysProp = ["us"],
  disallowEmptySelection = false,
}: ListBoxPlaygroundProps = {}) {
  const defaultSelectedKeys =
    typeof defaultSelectedKeysProp === "string"
      ? defaultSelectedKeysProp.split(",").map((value) => value.trim())
      : defaultSelectedKeysProp;

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
