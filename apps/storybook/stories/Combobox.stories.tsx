import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
} from "@dev-ui/components/combobox";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

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

type ComboboxStoryArgs = {
  ariaLabel: string;
  placeholder: string;
  isDisabled: boolean;
  isRequired: boolean;
  isInvalid: boolean;
  menuTrigger: "focus" | "input" | "manual";
  placement: "bottom" | "top" | "start" | "end";
};

const meta = {
  title: "Components/Combobox",
  tags: ["ai-generated"],
  argTypes: {
    ariaLabel: { control: "text" },
    placeholder: { control: "text" },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    isInvalid: { control: "boolean" },
    menuTrigger: {
      control: "select",
      options: ["focus", "input", "manual"],
    },
    placement: {
      control: "select",
      options: ["bottom", "top", "start", "end"],
    },
  },
  args: {
    ariaLabel: "Country",
    placeholder: "Select a country...",
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
    menuTrigger: "focus",
    placement: "bottom",
  },
  render: ({
    ariaLabel,
    placeholder,
    menuTrigger,
    placement,
    isDisabled,
    isRequired,
    isInvalid,
  }) => (
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
  ),
} satisfies Meta<ComboboxStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
