import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "@dev-ui/components/disclosure";

type DisclosurePlaygroundProps = {
  triggerLabel?: string;
  panelContent?: string;
  defaultExpanded?: boolean;
  isDisabled?: boolean;
};

export default function DisclosurePlayground({
  triggerLabel = "System Requirements",
  panelContent = "Requires a modern browser and at least 4GB of RAM.",
  defaultExpanded = false,
  isDisabled = false,
}: DisclosurePlaygroundProps = {}) {
  return (
    <Disclosure defaultExpanded={defaultExpanded} isDisabled={isDisabled}>
      <DisclosureTrigger>{triggerLabel}</DisclosureTrigger>
      <DisclosurePanel>{panelContent}</DisclosurePanel>
    </Disclosure>
  );
}
