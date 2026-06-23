import {
  Command,
  CommandContent,
  CommandInput,
  CommandItem,
  CommandSection,
  CommandSectionHeader,
} from "@dev-ui/components/command";

type CommandPlaygroundProps = {
  ariaLabel?: string;
  placeholder?: string;
  variant?: "default" | "borderless";
};

export default function CommandPlayground({
  ariaLabel = "Command menu",
  placeholder = "Type a command or search...",
  variant = "default",
}: CommandPlaygroundProps = {}) {
  return (
    <div
      style={{
        width: 420,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
      }}
    >
      <Command aria-label={ariaLabel} variant={variant}>
        <CommandInput aria-label="Search" placeholder={placeholder} />
        <CommandContent aria-label="Commands" selectionMode="none">
          <CommandSection title="Suggestions">
            <CommandSectionHeader>Suggestions</CommandSectionHeader>
            <CommandItem id="calendar">Calendar</CommandItem>
            <CommandItem id="emoji">Search Emoji</CommandItem>
            <CommandItem id="calculator">Calculator</CommandItem>
          </CommandSection>
          <CommandSection title="Settings">
            <CommandSectionHeader>Settings</CommandSectionHeader>
            <CommandItem id="profile">Profile</CommandItem>
            <CommandItem id="billing">Billing</CommandItem>
            <CommandItem id="settings">Settings</CommandItem>
          </CommandSection>
        </CommandContent>
      </Command>
    </div>
  );
}
