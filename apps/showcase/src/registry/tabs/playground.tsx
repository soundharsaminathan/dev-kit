import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";

type TabsPlaygroundProps = {
  "aria-label"?: string;
  defaultSelectedKey?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
  isDisabled?: boolean;
};

export default function TabsPlayground({
  "aria-label": ariaLabel = "Account settings",
  defaultSelectedKey = "account",
  orientation = "horizontal",
  variant = "default",
  isDisabled = false,
}: TabsPlaygroundProps = {}) {
  return (
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
  );
}
