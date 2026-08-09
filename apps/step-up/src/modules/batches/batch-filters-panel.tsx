import { Drawer } from "@dev-ui/components/drawer";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-filters-panel.module.scss";

type FilterSectionId = "suggested" | "status" | "audience" | "search";

const SECTIONS: Array<{ id: FilterSectionId; label: string }> = [
  { id: "suggested", label: "Suggested" },
  { id: "status", label: "Status" },
  { id: "audience", label: "Audience" },
  { id: "search", label: "Search" },
];

const STATUS_OPTIONS = [
  { id: "ALL", label: "All statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

const AUDIENCE_OPTIONS = [
  { id: "ALL", label: "All ages" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
];

export type BatchFiltersDraft = {
  status: string;
  category: string;
  search: string;
};

type BatchFiltersPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  value: BatchFiltersDraft;
  countMatches: (draft: BatchFiltersDraft) => number;
  onApply: (next: BatchFiltersDraft) => void;
};

export function BatchFiltersPanel({
  isOpen,
  onOpenChange,
  value,
  countMatches,
  onApply,
}: BatchFiltersPanelProps) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState<FilterSectionId>("suggested");
  const [draft, setDraft] = useState<BatchFiltersDraft>(value);

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
    const statusActive = draft.status !== "ALL" ? 1 : 0;
    const audienceActive = draft.category !== "ALL" ? 1 : 0;
    const searchActive = draft.search.trim() ? 1 : 0;
    return {
      suggested: statusActive + audienceActive,
      status: statusActive,
      audience: audienceActive,
      search: searchActive,
    } satisfies Record<FilterSectionId, number>;
  }, [draft]);

  const panelClassName = [
    styles.panel,
    isMobile ? styles.panelFullscreen : styles.panelSide,
  ].join(" ");

  function clearAll() {
    setDraft({
      status: "ALL",
      category: "ALL",
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
                  {STATUS_OPTIONS.filter((option) => option.id !== "ALL").map(
                    (option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.optionChip}
                        data-active={
                          draft.status === option.id ? "true" : undefined
                        }
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            status:
                              prev.status === option.id ? "ALL" : option.id,
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ),
                  )}
                  {AUDIENCE_OPTIONS.filter((option) => option.id !== "ALL").map(
                    (option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.optionChip}
                        data-active={
                          draft.category === option.id ? "true" : undefined
                        }
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            category:
                              prev.category === option.id ? "ALL" : option.id,
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

            {section === "status" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Status</h3>
                <ul className={styles.optionList}>
                  {STATUS_OPTIONS.map((option) => {
                    const active = draft.status === option.id;
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
                              status: option.id,
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

            {section === "audience" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Audience</h3>
                <ul className={styles.optionList}>
                  {AUDIENCE_OPTIONS.map((option) => {
                    const active = draft.category === option.id;
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
                              category: option.id,
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
                  label="Batch name"
                  value={draft.search}
                  onChange={(search) =>
                    setDraft((prev) => ({ ...prev, search }))
                  }
                  placeholder="Search batches"
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
