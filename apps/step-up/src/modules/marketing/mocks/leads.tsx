import { STUDENTS } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

type LeadsMockProps = {
  active?: boolean | undefined;
};

const SECTIONS = [
  { id: "new", label: "New leads", on: true },
  { id: "booked", label: "Trial booked", on: false },
  { id: "attended", label: "Trial attended", on: false },
  { id: "missed", label: "Trial missed", on: false },
  { id: "converted", label: "Converted", on: false },
  { id: "left", label: "Left leads", on: false },
  { id: "archived", label: "Archived", on: false },
];

const LEADS = [
  {
    ...STUDENTS[0],
    age: "10–20",
    followup: "Yesterday",
    trialWhen: "Today · 6:00 PM",
    batch: "Hip Hop Intermediate",
    action: "Confirm",
    soon: true,
  },
  {
    ...STUDENTS[1],
    age: "Under 10",
    followup: "No follow up",
    trialWhen: "Thu 6:00 PM",
    batch: "Ballet Foundations",
    action: "Call",
    soon: false,
  },
  {
    ...STUDENTS[2],
    age: "10–20",
    followup: "3 days ago",
    trialWhen: "Sat 10:00 AM",
    batch: "Contemporary Open",
    action: "Call",
    soon: false,
  },
] as const;

export function LeadsMock({ active = false }: LeadsMockProps) {
  return (
    <MockApp
      nav="leads"
      title="Trial caller"
      subtitle="3 new this week"
      action={<span className={styles.btn}>Add</span>}
    >
      <div className={styles.pipelineTabs} aria-hidden>
        {SECTIONS.map((section) => (
          <span
            key={section.id}
            className={styles.pipelineTab}
            data-on={section.on ? "true" : undefined}
          >
            {section.label}
          </span>
        ))}
      </div>
      <div className={styles.swipeTabs} aria-hidden>
        {SECTIONS.map((section) => (
          <span
            key={section.id}
            className={styles.swipeTab}
            data-on={section.on ? "true" : undefined}
          >
            {section.label}
          </span>
        ))}
      </div>
      <div className={styles.search}>Search leads</div>
      {LEADS.map((lead) => (
        <div
          key={lead.id}
          className={styles.leadCard}
          data-soon={lead.soon ? "true" : undefined}
          data-on={active && lead.id === "iniya" ? "true" : undefined}
        >
          <div className={styles.identity}>
            <span className={styles.avatar}>{lead.initials}</span>
            <div className={styles.grow}>
              <div className={styles.invoiceTop}>
                <span className={styles.rowTitle}>{lead.name}</span>
                <span className={styles.rowMeta}>{lead.age}</span>
              </div>
              <span className={styles.followChip}>{lead.followup}</span>
            </div>
            <span className={`${styles.btn} ${styles.btnSm}`}>
              {lead.action}
            </span>
          </div>
          <p className={styles.rowMeta}>{lead.trialWhen}</p>
          <p className={styles.rowMeta}>{lead.batch}</p>
        </div>
      ))}
    </MockApp>
  );
}
