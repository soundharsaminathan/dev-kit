import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteSection,
  AutocompleteSectionHeader,
} from "@dev-ui/components/autocomplete";

type AutocompletePlaygroundProps = {
  ariaLabel?: string;
  placeholder?: string;
  variant?: "default" | "borderless";
};

export default function AutocompletePlayground({
  ariaLabel = "Autocomplete menu",
  placeholder = "Type to search...",
  variant = "default",
}: AutocompletePlaygroundProps = {}) {
  return (
    <div style={{ width: 420 }}>
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
  );
}
