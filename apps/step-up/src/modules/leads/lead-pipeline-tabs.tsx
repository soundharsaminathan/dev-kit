import { Tab, TabList, Tabs } from "@dev-ui/components/tabs";
import { useIsMobile } from "@dev-ui/hooks";
import { LeadSwipeHeader } from "./lead-swipe-header";
import styles from "./leads.module.scss";
import { type LeadSection, SECTION_LABELS, SECTION_ORDER } from "./types";

type LeadPipelineTabsProps = {
  activeSection: LeadSection;
  onSelectSection: (section: LeadSection) => void;
};

export function LeadPipelineTabs({
  activeSection,
  onSelectSection,
}: LeadPipelineTabsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <LeadSwipeHeader
        activeSection={activeSection}
        onSelectSection={onSelectSection}
      />
    );
  }

  return (
    <Tabs
      selectedKey={activeSection}
      onSelectionChange={(key) => {
        const next = String(key);
        if (
          next !== activeSection &&
          (SECTION_ORDER as readonly string[]).includes(next)
        ) {
          onSelectSection(next as LeadSection);
        }
      }}
      aria-label="Lead pipeline sections"
      className={styles.tabs}
    >
      <TabList className={styles.tabList}>
        {SECTION_ORDER.map((section) => (
          <Tab key={section} id={section} className={styles.tab}>
            {SECTION_LABELS[section]}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
