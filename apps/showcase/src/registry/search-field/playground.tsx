import { Label } from "@dev-ui/components/field";
import {
  SearchField,
  SearchFieldClear,
  SearchFieldGroup,
  SearchFieldInput,
} from "@dev-ui/components/search-field";

type SearchFieldPlaygroundProps = {
  "aria-label"?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  showLabel?: boolean;
  labelText?: string;
};

export default function SearchFieldPlayground({
  showLabel = false,
  labelText = "Search",
  placeholder = "Search...",
  "aria-label": ariaLabel = "Search",
  isDisabled = false,
  isRequired = false,
  isReadOnly = false,
}: SearchFieldPlaygroundProps = {}) {
  const fieldProps = {
    "aria-label": ariaLabel,
    isDisabled,
    isRequired,
    isReadOnly,
  };

  return showLabel ? (
    <SearchField {...fieldProps}>
      <Label>{labelText}</Label>
      <SearchFieldGroup>
        <SearchFieldInput placeholder={placeholder} />
        <SearchFieldClear />
      </SearchFieldGroup>
    </SearchField>
  ) : (
    <SearchField {...fieldProps} placeholder={placeholder} />
  );
}
