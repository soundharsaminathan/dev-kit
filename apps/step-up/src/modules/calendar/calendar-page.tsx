import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Text } from "@dev-ui/components/text";
import { useIsMobile } from "@dev-ui/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SessionScheduleActions } from "@/modules/sessions/session-schedule-actions";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
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
  formatTime,
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
const WEEK_SLOT_KEYS = Array.from({ length: 4 }, (_, i) => `cal-week-slot-${i}`);

function CalendarSkeleton({ view }: { view: CalendarViewMode }) {
  if (view === "week") {
    return (
      <div className={styles.skeletonRoot} aria-hidden>
        <div className={styles.skeletonWeekHeader}>
          <div className={styles.skeletonWeekGutter} />
          {WEEK_DAY_KEYS.map((key) => (
            <div key={key} className={styles.skeletonWeekDayHeader}>
              <SkeletonBlock height="0.75rem" width="2.5rem" radius="999px" />
            </div>
          ))}
        </div>
        <div className={styles.skeletonWeekBody}>
          <div className={styles.skeletonWeekHours} />
          {WEEK_DAY_KEYS.map((dayKey) => (
            <div key={dayKey} className={styles.skeletonWeekColumn}>
              {WEEK_SLOT_KEYS.map((slotKey) => (
                <SkeletonBlock
                  key={`${dayKey}-${slotKey}`}
                  height="2.5rem"
                  radius="var(--radius-sm, 0.35rem)"
                />
              ))}
            </div>
          ))}
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

function EventDetail({
  selected,
  staffActions,
  onClose,
  onOpenAttendance,
  onOpenBookings,
  onOpenBatch,
  onCheckIn,
  onSessionDeleted,
}: {
  selected: CalendarEvent;
  staffActions: boolean;
  onClose: () => void;
  onOpenAttendance: () => void;
  onOpenBookings: () => void;
  onOpenBatch: () => void;
  onCheckIn: () => void;
  onSessionDeleted: () => void;
}) {
  const canManageSession =
    staffActions &&
    selected.kind === "SESSION" &&
    Boolean(selected.sessionId) &&
    Boolean(selected.batchId) &&
    selected.status !== "COMPLETED" &&
    selected.status !== "CANCELLED";

  return (
    <div className={styles.detail}>
      <p className={styles.detailKind}>
        {selected.kind === "SESSION" ? "Class session" : "Booking"}
        {selected.branchName ? ` · ${selected.branchName}` : ""}
      </p>
      <Text>
        {formatTime(new Date(selected.startsAt))} –{" "}
        {formatTime(new Date(selected.endsAt))}
      </Text>
      <Text className={styles.meta}>
        {new Date(selected.startsAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>
      {selected.bookingType ? (
        <Text className={styles.meta}>{selected.bookingType}</Text>
      ) : null}
      {canManageSession && selected.sessionId && selected.batchId ? (
        <SessionScheduleActions
          showAttendance
          menuTestId="calendar-session-actions"
          session={{
            id: selected.sessionId,
            batchId: selected.batchId,
            startsAt: selected.startsAt,
            endsAt: selected.endsAt,
            status: selected.status as
              | "SCHEDULED"
              | "COMPLETED"
              | "CANCELLED",
          }}
          onAttendance={onOpenAttendance}
          onChanged={onClose}
          onDeleted={onSessionDeleted}
        />
      ) : null}
      {staffActions &&
      selected.kind === "SESSION" &&
      selected.sessionId &&
      !canManageSession ? (
        <TouchButton variant="primary" fullWidth onClick={onOpenAttendance}>
          Attendance
        </TouchButton>
      ) : null}
      {staffActions && selected.kind === "BOOKING" ? (
        <TouchButton variant="primary" fullWidth onClick={onOpenBookings}>
          Open bookings
        </TouchButton>
      ) : null}
      {!staffActions && selected.kind === "SESSION" && selected.batchId ? (
        <TouchButton variant="primary" fullWidth onClick={onOpenBatch}>
          Open class
        </TouchButton>
      ) : null}
      {!staffActions && selected.kind === "SESSION" ? (
        <TouchButton variant="default" fullWidth onClick={onCheckIn}>
          Check in
        </TouchButton>
      ) : null}
      <TouchButton variant="quiet" fullWidth onClick={onClose}>
        Close
      </TouchButton>
    </div>
  );
}

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
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
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
    setSelected(event);
  };

  const openSelected = () => {
    if (!selected) return;
    if (selected.kind === "SESSION" && selected.sessionId && staffActions) {
      void navigate({
        to: "/app/sessions/$id/attendance",
        params: { id: selected.sessionId },
      });
      return;
    }
    if (selected.kind === "BOOKING" && staffActions) {
      void navigate({ to: "/app/bookings" });
    }
  };

  const detailProps = selected
    ? {
        selected,
        staffActions,
        onClose: () => setSelected(null),
        onOpenAttendance: () => {
          if (selected.sessionId) {
            void navigate({
              to: "/app/sessions/$id/attendance",
              params: { id: selected.sessionId },
            });
          }
        },
        onOpenBookings: openSelected,
        onOpenBatch: () => {
          if (selected.batchId) {
            void navigate({
              to: "/me/batches/$id",
              params: { id: selected.batchId },
            });
            setSelected(null);
          }
        },
        onCheckIn: () => {
          void navigate({ to: "/me/check-in" });
          setSelected(null);
        },
        onSessionDeleted: () => {
          setSelected(null);
          void eventsQuery.refetch();
        },
      }
    : null;

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

        <div
          className={styles.layout}
          data-has-side={!isMobile && selected ? "true" : undefined}
        >
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

          {!isMobile && selected && detailProps ? (
            <aside className={styles.side}>
              <div className={styles.sideCard}>
                <p className={styles.sideTitle}>{selected.title}</p>
                <EventDetail {...detailProps} />
              </div>
            </aside>
          ) : null}
        </div>

        {isMobile ? (
          <AppBottomSheet
            isOpen={Boolean(selected)}
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
            title={selected?.title ?? "Event"}
          >
            {selected && detailProps ? <EventDetail {...detailProps} /> : null}
          </AppBottomSheet>
        ) : null}
      </div>
    </Screen>
  );
}
