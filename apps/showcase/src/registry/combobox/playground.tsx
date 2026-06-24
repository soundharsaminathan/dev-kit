import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
} from "@dev-ui/components/combobox";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width={16}
      height={16}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ComboboxPlaygroundProps = {
  ariaLabel?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  menuTrigger?: "focus" | "input" | "manual";
  placement?: "bottom" | "top" | "start" | "end";
};

export default function ComboboxPlayground({
  ariaLabel = "Country",
  placeholder = "Select a country...",
  menuTrigger = "focus",
  placement = "bottom",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: ComboboxPlaygroundProps = {}) {
  return (
    <Combobox
      aria-label={ariaLabel}
      menuTrigger={menuTrigger}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      <InputGroup>
        <ComboboxInput placeholder={placeholder} />
        <InputGroupAddon>
          <ComboboxButton aria-label="Show suggestions">
            <ChevronDownIcon />
          </ComboboxButton>
        </InputGroupAddon>
      </InputGroup>
      <ComboboxPopover placement={placement}>
        <ComboboxItem id="us">United States</ComboboxItem>
        <ComboboxItem id="ca">Canada</ComboboxItem>
        <ComboboxItem id="uk">United Kingdom</ComboboxItem>
      </ComboboxPopover>
    </Combobox>
  );
}
