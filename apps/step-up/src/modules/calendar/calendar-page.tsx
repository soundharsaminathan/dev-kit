import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Text } from "@dev-ui/components/text";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./calendar-page.module.scss";
import { MonthView } from "./month-view";
import {
  addDays,
  addMonths,
  type CalendarEvent,
  type CalendarScope,
  type CalendarViewMode,
  formatMonthLabel,
  rangeForView,
} from "./types";
import { useCalendarEvents } from "./use-calendar-events";
import { WeekView } from "./week-view";

const MONTH_CELL_KEYS = Array.from(
  { length: 42 },
  (_, i) => `cal-month-cell-${i}`,
);
const WEEKDAY_KEYS = Array.from({ length: 7 }, (_, i) => `cal-weekday-${i}`);
const WEEK_DAY_KEYS = Array.from({ length: 7 }, (_, i) => `cal-week-day-${i}`);
const WEEK_HOUR_KEYS = Array.from(
  { length: 24 },
  (_, i) => `cal-week-hour-${i}`,
);
const WEEK_EVENT_PLACEHOLDERS = [
  { day: 0, top: "12%", height: "8%" },
  { day: 1, top: "28%", height: "6%" },
  { day: 2, top: "18%", height: "10%" },
  { day: 3, top: "42%", height: "7%" },
  { day: 4, top: "22%", height: "9%" },
  { day: 5, top: "55%", height: "6%" },
  { day: 6, top: "35%", height: "8%" },
] as const;

function CalendarSkeleton({ view }: { view: CalendarViewMode }) {
  if (view === "week") {
    return (
      <div className={styles.skeletonRoot} aria-hidden>
        <div className={styles.skeletonWeekScroll}>
          <div className={styles.skeletonWeekGrid}>
            <div className={styles.skeletonWeekHeader}>
              <div className={styles.skeletonWeekGutter} />
              {WEEK_DAY_KEYS.map((key) => (
                <div key={key} className={styles.skeletonWeekDayHeader}>
                  <SkeletonBlock
                    height="0.8rem"
                    width="2.75rem"
                    radius="999px"
                  />
                </div>
              ))}
            </div>
            <div className={styles.skeletonWeekBody}>
              <div className={styles.skeletonWeekHours}>
                {WEEK_HOUR_KEYS.map((key, index) => (
                  <div key={key} className={styles.skeletonWeekHourLabel}>
                    {index === 0 ? null : (
                      <SkeletonBlock
                        height="0.55rem"
                        width="1.5rem"
                        radius="999px"
                      />
                    )}
                  </div>
                ))}
              </div>
              {WEEK_DAY_KEYS.map((dayKey, dayIndex) => {
                const event = WEEK_EVENT_PLACEHOLDERS[dayIndex];
                return (
                  <div key={dayKey} className={styles.skeletonWeekColumn}>
                    {WEEK_HOUR_KEYS.map((hourKey) => (
                      <div
                        key={`${dayKey}-${hourKey}`}
                        className={styles.skeletonWeekHourSlot}
                      />
                    ))}
                    {event ? (
                      <div className={styles.skeletonWeekEvents}>
                        <div
                          className={styles.skeletonWeekEvent}
                          style={{ top: event.top, height: event.height }}
                        >
                          <SkeletonBlock
                            height="100%"
                            radius="var(--radius-sm, 0.35rem)"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.skeletonRoot} aria-hidden>
      <div className={styles.skeletonWeekdays}>
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className={styles.skeletonWeekday}>
            <SkeletonBlock height="0.65rem" width="1.75rem" radius="999px" />
          </div>
        ))}
      </div>
      <div className={styles.skeletonMonthGrid}>
        {MONTH_CELL_KEYS.map((key) => (
          <div key={key} className={styles.skeletonCell}>
            <SkeletonBlock height="1rem" width="1.25rem" radius="999px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export type BranchOption = {
  id: string;
  name: string;
};

type CalendarPageProps = {
  title: string;
  description: string;
  scope: CalendarScope;
  view: CalendarViewMode;
  focus: Date;
  branches?: BranchOption[] | undefined;
  selectedBranchId?: string | null | undefined;
  onViewChange: (view: CalendarViewMode) => void;
  onFocusChange: (focus: Date) => void;
  onBranchChange?: ((branchId: string | null) => void) | undefined;
  staffActions?: boolean | undefined;
};

export function CalendarPage({
  title,
  description,
  scope,
  view,
  focus,
  branches,
  selectedBranchId,
  onViewChange,
  onFocusChange,
  onBranchChange,
  staffActions = false,
}: CalendarPageProps) {
  const navigate = useNavigate();
  const [scrollToNowToken, setScrollToNowToken] = useState(0);
  const range = useMemo(() => rangeForView(focus, view), [focus, view]);

  const eventsQuery = useCalendarEvents(scope, range.from, range.to);

  const rangeLabel =
    view === "week"
      ? `${range.from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${range.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : formatMonthLabel(focus);

  const goPrev = () => {
    onFocusChange(view === "week" ? addDays(focus, -7) : addMonths(focus, -1));
  };

  const goNext = () => {
    onFocusChange(view === "week" ? addDays(focus, 7) : addMonths(focus, 1));
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.kind === "SESSION" && event.sessionId && staffActions) {
      void navigate({
        to: "/app/sessions/$id/attendance",
        params: { id: event.sessionId },
      });
      return;
    }
    if (event.kind === "BOOKING" && staffActions) {
      void navigate({ to: "/app/bookings" });
      return;
    }
    if (!staffActions && event.kind === "SESSION" && event.batchId) {
      void navigate({
        to: "/me/batches/$id",
        params: { id: event.batchId },
      });
      return;
    }
    if (!staffActions && event.kind === "SESSION") {
      void navigate({ to: "/me/check-in" });
    }
  };

  return (
    <Screen
      title={title}
      subtitle={description}
      wide
      className={styles.screen ?? ""}
      actions={
        <div className={styles.viewToggle}>
          <TouchButton
            size="sm"
            variant={view === "week" ? "primary" : "quiet"}
            onClick={() => onViewChange("week")}
          >
            Week
          </TouchButton>
          <TouchButton
            size="sm"
            variant={view === "month" ? "primary" : "quiet"}
            onClick={() => onViewChange("month")}
          >
            Month
          </TouchButton>
        </div>
      }
    >
      <div className={styles.root}>
        <div className={styles.navRow}>
          <div className={styles.navButtons}>
            <TouchButton size="sm" variant="quiet" onClick={goPrev}>
              Previous
            </TouchButton>
            <TouchButton
              size="sm"
              variant="default"
              onClick={() => {
                onFocusChange(new Date());
                setScrollToNowToken((token) => token + 1);
              }}
            >
              Today
            </TouchButton>
            <TouchButton size="sm" variant="quiet" onClick={goNext}>
              Next
            </TouchButton>
          </div>
          <Text className={styles.rangeLabel}>{rangeLabel}</Text>
          {branches && onBranchChange ? (
            <div className={styles.branchSelect}>
              <Select
                aria-label="Branch"
                selectedKey={selectedBranchId ?? "all"}
                onSelectionChange={(key) => {
                  const value = String(key);
                  onBranchChange(value === "all" ? null : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="all" textValue="All branches">
                    All branches
                  </SelectItem>
                  {branches.map((branch) => (
                    <SelectItem
                      key={branch.id}
                      id={branch.id}
                      textValue={branch.name}
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className={styles.layout}>
          <div className={styles.main}>
            {eventsQuery.isLoading ? <CalendarSkeleton view={view} /> : null}

            {eventsQuery.isError ? (
              <ErrorState
                description={
                  eventsQuery.error instanceof Error
                    ? eventsQuery.error.message
                    : "Could not load calendar."
                }
                action={
                  <TouchButton
                    variant="primary"
                    onClick={() => eventsQuery.refetch()}
                  >
                    Try again
                  </TouchButton>
                }
              />
            ) : null}

            {!eventsQuery.isLoading && !eventsQuery.isError ? (
              view === "week" ? (
                <WeekView
                  focus={focus}
                  events={eventsQuery.data ?? []}
                  scrollToNowToken={scrollToNowToken}
                  onSelectEvent={handleSelectEvent}
                />
              ) : (
                <MonthView
                  focus={focus}
                  events={eventsQuery.data ?? []}
                  scrollToNowToken={scrollToNowToken}
                  onSelectEvent={handleSelectEvent}
                  onSelectDay={(day) => {
                    onFocusChange(day);
                    onViewChange("week");
                  }}
                />
              )
            ) : null}
          </div>
        </div>
      </div>
    </Screen>
  );
}
