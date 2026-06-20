import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "@dev-ui/components/disclosure";
import type { Meta, StoryObj } from "@storybook/react-vite";

type DisclosureStoryArgs = {
  triggerLabel: string;
  panelContent: string;
  defaultExpanded: boolean;
  isDisabled: boolean;
};

const meta = {
  title: "Components/Disclosure",
  tags: ["ai-generated"],
  argTypes: {
    triggerLabel: { control: "text" },
    panelContent: { control: "text" },
    defaultExpanded: { control: "boolean" },
    isDisabled: { control: "boolean" },
  },
  args: {
    triggerLabel: "System Requirements",
    panelContent: "Requires a modern browser and at least 4GB of RAM.",
    defaultExpanded: false,
    isDisabled: false,
  },
  render: ({ triggerLabel, panelContent, defaultExpanded, isDisabled }) => (
    <Disclosure defaultExpanded={defaultExpanded} isDisabled={isDisabled}>
      <DisclosureTrigger>{triggerLabel}</DisclosureTrigger>
      <DisclosurePanel>{panelContent}</DisclosurePanel>
    </Disclosure>
  ),
} satisfies Meta<DisclosureStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
