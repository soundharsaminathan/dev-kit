import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteSection,
  AutocompleteSectionHeader,
} from "@dev-ui/components/autocomplete";
import type { Meta, StoryObj } from "@storybook/react-vite";

type AutocompleteStoryArgs = {
  ariaLabel: string;
  placeholder: string;
  variant: "default" | "borderless";
};

const meta = {
  title: "Components/Autocomplete",
  tags: ["ai-generated"],
  argTypes: {
    ariaLabel: { control: "text" },
    placeholder: { control: "text" },
    variant: {
      control: "select",
      options: ["default", "borderless"],
    },
  },
  args: {
    ariaLabel: "Autocomplete menu",
    placeholder: "Type to search...",
    variant: "default",
  },
  render: ({ ariaLabel, placeholder, variant }) => (
    <div
      style={{
        width: 420,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
      }}
    >
      <Autocomplete aria-label={ariaLabel} variant={variant}>
        <AutocompleteInput aria-label="Search" placeholder={placeholder} />
        <AutocompleteContent aria-label="Results" selectionMode="none">
          <AutocompleteSection title="Suggestions">
            <AutocompleteSectionHeader>Suggestions</AutocompleteSectionHeader>
            <AutocompleteItem id="calendar">Calendar</AutocompleteItem>
            <AutocompleteItem id="emoji">Search Emoji</AutocompleteItem>
            <AutocompleteItem id="calculator">Calculator</AutocompleteItem>
          </AutocompleteSection>
          <AutocompleteSection title="Settings">
            <AutocompleteSectionHeader>Settings</AutocompleteSectionHeader>
            <AutocompleteItem id="profile">Profile</AutocompleteItem>
            <AutocompleteItem id="billing">Billing</AutocompleteItem>
            <AutocompleteItem id="settings">Settings</AutocompleteItem>
          </AutocompleteSection>
        </AutocompleteContent>
      </Autocomplete>
    </div>
  ),
} satisfies Meta<AutocompleteStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Borderless: Story = {
  args: {
    variant: "borderless",
  },
};
