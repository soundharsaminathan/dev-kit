import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import type { Meta, StoryObj } from "@storybook/react-vite";

type TabsStoryArgs = {
  "aria-label": string;
  defaultSelectedKey: string;
  orientation: "horizontal" | "vertical";
  variant: "default" | "line";
  isDisabled: boolean;
};

const meta = {
  title: "Components/Tabs",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    defaultSelectedKey: {
      control: "select",
      options: ["account", "password"],
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    variant: {
      control: "select",
      options: ["default", "line"],
    },
    isDisabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Account settings",
    defaultSelectedKey: "account",
    orientation: "horizontal",
    variant: "default",
    isDisabled: false,
  },
  render: ({
    "aria-label": ariaLabel,
    defaultSelectedKey,
    orientation,
    variant,
    isDisabled,
  }) => (
    <Tabs
      defaultSelectedKey={defaultSelectedKey}
      aria-label={ariaLabel}
      orientation={orientation}
      isDisabled={isDisabled}
    >
      <TabList variant={variant}>
        <Tab id="account">Account</Tab>
        <Tab id="password">Password</Tab>
      </TabList>
      <TabPanel id="account">Manage your account settings.</TabPanel>
      <TabPanel id="password">Change your password.</TabPanel>
    </Tabs>
  ),
} satisfies Meta<TabsStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Line: Story = {
  args: {
    variant: "line",
    "aria-label": "Dashboard",
    defaultSelectedKey: "account",
  },
};
