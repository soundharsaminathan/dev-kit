import { Button } from "@dev-ui/components/button";
import {
  PanelLeftIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarList,
  SidebarProvider,
  SidebarSection,
  SidebarSectionHeading,
  useSidebarContext,
} from "@dev-ui/components/sidebar";

function SidebarToggle() {
  const { toggleSidebar } = useSidebarContext("SidebarToggle");
  return (
    <Button
      variant="quiet"
      isIconOnly
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
    >
      <PanelLeftIcon />
    </Button>
  );
}

type SidebarPlaygroundProps = {
  defaultOpen?: boolean;
  placement?: "left" | "right";
};

export default function SidebarPlayground({
  defaultOpen = true,
  placement = "right",
}: SidebarPlaygroundProps = {}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar placement={placement}>
        <SidebarHeader>
          <SidebarToggle />
        </SidebarHeader>
        <SidebarContent>
          <SidebarSection>
            <SidebarSectionHeading>Navigation</SidebarSectionHeading>
            <SidebarList>
              <SidebarItem tooltip="Home">
                <Button variant="quiet">Home</Button>
              </SidebarItem>
              <SidebarItem tooltip="Projects">
                <Button variant="quiet">Projects</Button>
              </SidebarItem>
              <SidebarItem tooltip="Settings">
                <Button variant="quiet">Settings</Button>
              </SidebarItem>
            </SidebarList>
          </SidebarSection>
        </SidebarContent>
        <SidebarFooter>
          <Button variant="quiet">Account</Button>
        </SidebarFooter>
      </Sidebar>
      <main style={{ flex: 1, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Main content</h1>
        <p>Press Cmd+B to toggle the sidebar.</p>
      </main>
    </SidebarProvider>
  );
}
