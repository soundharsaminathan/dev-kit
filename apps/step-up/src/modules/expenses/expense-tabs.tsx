import { Tab, TabList, Tabs } from "@dev-ui/components/tabs";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import styles from "./expenses.module.scss";

const TABS = [
  { id: "dashboard", to: "/app/expenses", label: "Dashboard" },
  { id: "list", to: "/app/expenses/list", label: "All expenses" },
  { id: "reports", to: "/app/expenses/reports", label: "Reports" },
  { id: "categories", to: "/app/expenses/categories", label: "Categories" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabIdFromPath(pathname: string): TabId {
  if (pathname.startsWith("/app/expenses/list")) return "list";
  if (pathname.startsWith("/app/expenses/reports")) return "reports";
  if (pathname.startsWith("/app/expenses/categories")) return "categories";
  return "dashboard";
}

export function ExpenseTabs() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedKey = tabIdFromPath(pathname);

  return (
    <Tabs
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        const tab = TABS.find((item) => item.id === key);
        if (tab && tab.id !== selectedKey) {
          void navigate({ to: tab.to });
        }
      }}
      aria-label="Expenses sections"
      className={styles.tabs}
    >
      <TabList className={styles.tabList}>
        {TABS.map((tab) => (
          <Tab key={tab.id} id={tab.id}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
