import { Drawer } from "@dev-ui/components/drawer";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
  PERIOD_OPTIONS,
  STAGE_OPTIONS,
  type StudentFiltersDraft,
  type StudentFunnelPeriod,
} from "./student-filter-types";
import styles from "./student-filters-panel.module.scss";

type FilterSectionId =
  | "suggested"
  | "stage"
  | "period"
  | "ageRange"
  | "gender"
  | "search";

const SECTIONS: Array<{ id: FilterSectionId; label: string }> = [
  { id: "suggested", label: "Suggested" },
  { id: "stage", label: "Stage" },
  { id: "period", label: "Period" },
  { id: "ageRange", label: "Age range" },
  { id: "gender", label: "Gender" },
  { id: "search", label: "Search" },
];

type StudentFiltersPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  value: StudentFiltersDraft;
  countMatches: (draft: StudentFiltersDraft) => number;
  onApply: (next: StudentFiltersDraft) => void;
};

export function StudentFiltersPanel({
  isOpen,
  onOpenChange,
  value,
  countMatches,
  onApply,
}: StudentFiltersPanelProps) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState<FilterSectionId>("suggested");
  const [draft, setDraft] = useState<StudentFiltersDraft>(value);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(value);
    setSection("suggested");
  }, [isOpen, value]);

  const resultCount = countMatches(isOpen ? draft : value);
  const resultLabel =
    resultCount === 0
      ? "Show 0 results"
      : `Show ${resultCount} result${resultCount === 1 ? "" : "s"}`;

  const activeCounts = useMemo(() => {
    const stageActive = draft.stage !== "ALL" ? 1 : 0;
    const periodActive = draft.period !== "lifetime" ? 1 : 0;
    const ageActive = draft.ageRange !== "ALL" ? 1 : 0;
    const genderActive = draft.gender !== "ALL" ? 1 : 0;
    const searchActive = draft.search.trim() ? 1 : 0;
    return {
      suggested: stageActive + periodActive + ageActive + genderActive,
      stage: stageActive,
      period: periodActive,
      ageRange: ageActive,
      gender: genderActive,
      search: searchActive,
    } satisfies Record<FilterSectionId, number>;
  }, [draft]);

  const panelClassName = [
    styles.panel,
    isMobile ? styles.panelFullscreen : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  function clearAll() {
    setDraft({
      stage: "ALL",
      period: "lifetime",
      ageRange: "ALL",
      gender: "ALL",
      search: "",
    });
  }

  function applyAndClose() {
    onApply({ ...draft, search: draft.search.trim() });
    onOpenChange(false);
  }

  return (
    <Drawer
      placement="right"
      sizing="static"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={panelClassName}
    >
      <div className={styles.shell}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close filters"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" />
          </button>
        </div>

        <div className={styles.columns}>
          <nav className={styles.nav} aria-label="Filter categories">
            {SECTIONS.map((item) => {
              const count = activeCounts[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={styles.navItem}
                  data-active={section === item.id ? "true" : undefined}
                  onClick={() => setSection(item.id)}
                >
                  <span className={styles.navLabel}>{item.label}</span>
                  {count > 0 ? (
                    <span className={styles.navCount}>{count}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className={styles.content}>
            {section === "suggested" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Suggested</h3>
                <div className={styles.chipGrid}>
                  {STAGE_OPTIONS.filter((option) => option.id !== "ALL").map(
                    (option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.optionChip}
                        data-active={
                          draft.stage === option.id ? "true" : undefined
                        }
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stage: prev.stage === option.id ? "ALL" : option.id,
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ),
                  )}
                  {PERIOD_OPTIONS.filter(
                    (option) => option.id !== "lifetime",
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.optionChip}
                      data-active={
                        draft.period === option.id ? "true" : undefined
                      }
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          period:
                            prev.period === option.id
                              ? "lifetime"
                              : (option.id as StudentFunnelPeriod),
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                  {AGE_RANGE_OPTIONS.filter(
                    (option) => option.id !== "ALL",
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.optionChip}
                      data-active={
                        draft.ageRange === option.id ? "true" : undefined
                      }
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          ageRange:
                            prev.ageRange === option.id ? "ALL" : option.id,
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                  {GENDER_OPTIONS.filter((option) => option.id !== "ALL").map(
                    (option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.optionChip}
                        data-active={
                          draft.gender === option.id ? "true" : undefined
                        }
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            gender:
                              prev.gender === option.id ? "ALL" : option.id,
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {section === "stage" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Stage</h3>
                <ul className={styles.optionList}>
                  {STAGE_OPTIONS.map((option) => {
                    const active = draft.stage === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={styles.optionRow}
                          data-active={active ? "true" : undefined}
                          aria-pressed={active}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              stage: option.id,
                            }))
                          }
                        >
                          <span>{option.label}</span>
                          {active ? (
                            <Icon name="check" className={styles.checkIcon} />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {section === "period" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Period</h3>
                <ul className={styles.optionList}>
                  {PERIOD_OPTIONS.map((option) => {
                    const active = draft.period === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={styles.optionRow}
                          data-active={active ? "true" : undefined}
                          aria-pressed={active}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              period: option.id,
                            }))
                          }
                        >
                          <span>{option.label}</span>
                          {active ? (
                            <Icon name="check" className={styles.checkIcon} />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {section === "ageRange" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Age range</h3>
                <ul className={styles.optionList}>
                  {AGE_RANGE_OPTIONS.map((option) => {
                    const active = draft.ageRange === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={styles.optionRow}
                          data-active={active ? "true" : undefined}
                          aria-pressed={active}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              ageRange: option.id,
                            }))
                          }
                        >
                          <span>{option.label}</span>
                          {active ? (
                            <Icon name="check" className={styles.checkIcon} />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {section === "gender" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Gender</h3>
                <ul className={styles.optionList}>
                  {GENDER_OPTIONS.map((option) => {
                    const active = draft.gender === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={styles.optionRow}
                          data-active={active ? "true" : undefined}
                          aria-pressed={active}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              gender: option.id,
                            }))
                          }
                        >
                          <span>{option.label}</span>
                          {active ? (
                            <Icon name="check" className={styles.checkIcon} />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {section === "search" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Search</h3>
                <FormInput
                  label="Name, email, or phone"
                  value={draft.search}
                  onChange={(search) =>
                    setDraft((prev) => ({ ...prev, search }))
                  }
                  placeholder="Search students"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.footer}>
          <TouchButton variant="quiet" onClick={clearAll}>
            Clear
          </TouchButton>
          <TouchButton variant="primary" onClick={applyAndClose}>
            {resultLabel}
          </TouchButton>
        </div>
      </div>
    </Drawer>
  );
}
