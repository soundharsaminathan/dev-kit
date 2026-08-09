import { Drawer } from "@dev-ui/components/drawer";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./discover-filters-panel.module.scss";
import type { DiscoverFilters } from "./use-discover";
import { useDiscoverBatches } from "./use-discover";

type FilterSectionId = "suggested" | "audience" | "style";

const SECTIONS: Array<{ id: FilterSectionId; label: string }> = [
  { id: "suggested", label: "Suggested" },
  { id: "audience", label: "Audience" },
  { id: "style", label: "Style" },
];

const AUDIENCE_OPTIONS = [
  { id: "ALL", label: "All ages" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
] as const;

function audienceOptionsForPreferred(
  preferred: "KIDS" | "ADULTS" | null | undefined,
): Array<{ id: string; label: string }> {
  if (!preferred) return [...AUDIENCE_OPTIONS];
  const other = preferred === "ADULTS" ? "KIDS" : "ADULTS";
  const byId = Object.fromEntries(
    AUDIENCE_OPTIONS.map((option) => [option.id, option]),
  ) as Record<string, { id: string; label: string }>;
  return [byId.ALL!, byId[preferred]!, byId[other]!];
}

export type DiscoverFiltersDraft = {
  category: string;
  style?: string;
};

type DiscoverFiltersPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  value: DiscoverFiltersDraft;
  styleOptions: Array<{ id: string; label: string }>;
  preferredCategory?: "KIDS" | "ADULTS" | null;
  branchId?: string;
  search?: string;
  onApply: (next: DiscoverFiltersDraft) => void;
};

function toQueryFilters(
  draft: DiscoverFiltersDraft,
  branchId?: string,
  search?: string,
): DiscoverFilters {
  const filters: DiscoverFilters = {};
  if (draft.category !== "ALL") filters.category = draft.category;
  if (draft.style) filters.style = draft.style;
  if (search?.trim()) filters.search = search.trim();
  if (branchId) filters.branchId = branchId;
  return filters;
}

function withStyle(
  draft: DiscoverFiltersDraft,
  style?: string,
): DiscoverFiltersDraft {
  const next: DiscoverFiltersDraft = {
    category: draft.category,
  };
  if (style) next.style = style;
  return next;
}

export function DiscoverFiltersPanel({
  isOpen,
  onOpenChange,
  value,
  styleOptions,
  preferredCategory = null,
  branchId,
  search,
  onApply,
}: DiscoverFiltersPanelProps) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState<FilterSectionId>("suggested");
  const [draft, setDraft] = useState<DiscoverFiltersDraft>(value);
  const audienceOptions = useMemo(
    () => audienceOptionsForPreferred(preferredCategory),
    [preferredCategory],
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(value);
    setSection("suggested");
  }, [isOpen, value]);

  const previewQuery = useDiscoverBatches(
    toQueryFilters(isOpen ? draft : value, branchId, search),
  );

  const resultCount = previewQuery.data?.length;

  const resultLabel =
    resultCount == null
      ? "Show results"
      : resultCount === 0
        ? "Show 0 results"
        : `Show ${resultCount} result${resultCount === 1 ? "" : "s"}`;

  const activeCounts = useMemo(() => {
    const styleActive = draft.style ? 1 : 0;
    const audienceActive = draft.category !== "ALL" ? 1 : 0;
    return {
      suggested: audienceActive + styleActive,
      audience: audienceActive,
      style: styleActive,
    } satisfies Record<FilterSectionId, number>;
  }, [draft]);

  const panelClassName = [
    styles.panel,
    isMobile ? styles.panelFullscreen : styles.panelSide,
  ].join(" ");

  function clearAll() {
    setDraft({ category: "ALL" });
  }

  function applyAndClose() {
    onApply(withStyle(draft, draft.style));
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
                  {audienceOptions
                    .filter((option) => option.id !== "ALL")
                    .map((option) => (
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
                    ))}
                  {styleOptions.slice(0, 6).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.optionChip}
                      data-active={
                        draft.style === option.id ? "true" : undefined
                      }
                      onClick={() =>
                        setDraft((prev) =>
                          withStyle(
                            prev,
                            prev.style === option.id ? undefined : option.id,
                          ),
                        )
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {section === "audience" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Audience</h3>
                <ul className={styles.optionList}>
                  {audienceOptions.map((option) => {
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

            {section === "style" ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Style</h3>
                {styleOptions.length === 0 ? (
                  <p className={styles.emptyHint}>
                    Styles appear once classes are loaded.
                  </p>
                ) : (
                  <ul className={styles.optionList}>
                    <li>
                      <button
                        type="button"
                        className={styles.optionRow}
                        data-active={!draft.style ? "true" : undefined}
                        aria-pressed={!draft.style}
                        onClick={() => setDraft((prev) => withStyle(prev))}
                      >
                        <span>Any style</span>
                        {!draft.style ? (
                          <Icon name="check" className={styles.checkIcon} />
                        ) : null}
                      </button>
                    </li>
                    {styleOptions.map((option) => {
                      const active = draft.style === option.id;
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            className={styles.optionRow}
                            data-active={active ? "true" : undefined}
                            aria-pressed={active}
                            onClick={() =>
                              setDraft((prev) => withStyle(prev, option.id))
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
                )}
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
