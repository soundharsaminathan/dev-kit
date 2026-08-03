import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import {
  type BatchOverviewSession,
  formatSessionRange,
  sessionTimingState,
  upcomingSessions,
} from "./batch-overview-helpers";
import styles from "./batch-sessions-lane.module.scss";

const DEFAULT_LIMIT = 5;

type BatchSessionsLaneProps = {
  batchId: string;
  sessions?: BatchOverviewSession[] | undefined;
  limit?: number | undefined;
};

function toLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultSessionWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(end),
  };
}

export function BatchSessionsLane({
  batchId,
  sessions,
  limit = DEFAULT_LIMIT,
}: BatchSessionsLaneProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSessionsLane");
  const upcoming = upcomingSessions(sessions, new Date(), limit);
  const [sheetOpen, setSheetOpen] = useState(false);
  const defaults = defaultSessionWindow();
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);
  const [sessionType, setSessionType] = useState<"REGULAR" | "TRIAL">(
    "REGULAR",
  );

  const createSession = useMutation({
    mutationFn: () =>
      api.post("/sessions", {
        batchId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        type: sessionType,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      toast({
        title: "Session added",
        description: "The new session is on the schedule.",
        variant: "success",
      });
      setSheetOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Couldn’t create session",
        description:
          error instanceof Error ? error.message : "Could not create session.",
        variant: "error",
      });
    },
  });

  const timesValid =
    Boolean(startsAt && endsAt) &&
    new Date(endsAt).getTime() > new Date(startsAt).getTime();

  function openSheet() {
    const next = defaultSessionWindow();
    setStartsAt(next.startsAt);
    setEndsAt(next.endsAt);
    setSessionType("REGULAR");
    setSheetOpen(true);
  }

  return (
    <>
      <section className={styles.root} aria-label="Upcoming sessions">
        <div className={styles.header}>
          <h3 className={styles.title}>Upcoming sessions</h3>
          <div className={styles.headerActions}>
            {upcoming.length > 0 ? (
              <span className={styles.count}>{upcoming.length}</span>
            ) : null}
            <Button
              size="sm"
              variant="quiet"
              data-testid="add-session"
              onClick={openSheet}
            >
              Add session
            </Button>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className={styles.empty}>No upcoming sessions on the schedule.</p>
        ) : (
          <ul className={styles.list}>
            {upcoming.map((session, index) => {
              const state = sessionTimingState(session);
              return (
                <li key={session.id}>
                  <Link
                    to="/app/sessions/$id/attendance"
                    params={{ id: session.id }}
                    className={styles.row}
                    data-state={state}
                    data-first={index === 0 ? "true" : undefined}
                  >
                    <div className={styles.copy}>
                      <span className={styles.when}>
                        {formatSessionRange(session.startsAt, session.endsAt)}
                      </span>
                      <span className={styles.action}>
                        {state === "now"
                          ? "Take attendance"
                          : "Open attendance"}
                      </span>
                    </div>
                    {state === "now" ? (
                      <span className={styles.live}>Now</span>
                    ) : null}
                    <Icon name="chevron-right" className={styles.chevron} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AppBottomSheet
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Add session"
      >
        <div className={styles.sheetStack}>
          <FormInput
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
            data-testid="session-starts-at"
          />
          <FormInput
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
            data-testid="session-ends-at"
          />
          <Select
            label="Type"
            value={sessionType}
            onChange={(key) => setSessionType(key as "REGULAR" | "TRIAL")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="REGULAR">Regular</SelectItem>
              <SelectItem id="TRIAL">Trial</SelectItem>
            </SelectContent>
          </Select>
          {!timesValid ? (
            <p className={styles.sheetError}>
              End time must be later than start time.
            </p>
          ) : null}
          {createSession.isError ? (
            <p className={styles.sheetError} role="alert">
              {createSession.error instanceof Error
                ? createSession.error.message
                : "Could not create session."}
            </p>
          ) : null}
          <Button
            variant="primary"
            isDisabled={!timesValid}
            isPending={createSession.isPending}
            data-testid="confirm-add-session"
            onClick={() => createSession.mutate()}
          >
            Create session
          </Button>
        </div>
      </AppBottomSheet>
    </>
  );
}
