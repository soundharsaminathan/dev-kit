import { Button } from "@dev-ui/components/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./session-schedule-actions.module.scss";

export type SessionScheduleTarget = {
  id: string;
  batchId: string;
  startsAt: string;
  endsAt: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED" | undefined;
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

type SessionScheduleActionsProps = {
  session: SessionScheduleTarget;
  /** When true, renders Attendance + more menu (calendar detail). */
  showAttendance?: boolean | undefined;
  onAttendance?: (() => void) | undefined;
  onChanged?: (() => void) | undefined;
  onDeleted?: (() => void) | undefined;
  menuTestId?: string | undefined;
};

export function SessionScheduleActions({
  session,
  showAttendance = false,
  onAttendance,
  onChanged,
  onDeleted,
  menuTestId = "session-schedule-actions",
}: SessionScheduleActionsProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("SessionScheduleActions");
  const [changeOpen, setChangeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(session.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(session.endsAt));

  const canEdit = session.status !== "COMPLETED" && session.status !== "CANCELLED";

  async function invalidateSessionQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["session", session.id] }),
      queryClient.invalidateQueries({ queryKey: ["batch", session.batchId] }),
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] }),
      queryClient.invalidateQueries({
        queryKey: ["attendance-roster", session.id],
      }),
    ]);
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/sessions/${session.id}`, {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    onSuccess: async () => {
      setChangeOpen(false);
      await invalidateSessionQueries();
      toast({
        title: "Session updated",
        description: "Date and time were changed. Students were notified.",
        variant: "success",
      });
      onChanged?.();
    },
    onError: (error) => {
      toast({
        title: "Couldn’t update session",
        description:
          error instanceof Error ? error.message : "Could not update session.",
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/sessions/${session.id}`),
    onSuccess: async () => {
      setDeleteOpen(false);
      await invalidateSessionQueries();
      toast({
        title: "Session deleted",
        description: "The session was cancelled. Students were notified.",
        variant: "success",
      });
      onDeleted?.();
    },
    onError: (error) => {
      toast({
        title: "Couldn’t delete session",
        description:
          error instanceof Error ? error.message : "Could not delete session.",
        variant: "error",
      });
    },
  });

  const timesValid =
    Boolean(startsAt && endsAt) &&
    new Date(endsAt).getTime() > new Date(startsAt).getTime();

  function openChange() {
    setStartsAt(toLocalInputValue(session.startsAt));
    setEndsAt(toLocalInputValue(session.endsAt));
    setChangeOpen(true);
  }

  function handleMenuAction(key: string | number) {
    if (key === "change") openChange();
    if (key === "delete") setDeleteOpen(true);
  }

  const menu = canEdit ? (
    <Menu>
      <TouchButton
        size="sm"
        variant={showAttendance ? "quiet" : "default"}
        aria-label="More session actions"
        data-testid={menuTestId}
      >
        <Icon name="more-horizontal" />
        {showAttendance ? null : "More"}
      </TouchButton>
      <MenuContent
        placement="bottom end"
        onAction={handleMenuAction}
        aria-label="Session schedule actions"
      >
        <MenuItem id="change" textValue="Change date and time">
          <MenuItemLabel>Change date/time</MenuItemLabel>
        </MenuItem>
        <MenuItem id="delete" textValue="Delete session" variant="danger">
          <MenuItemLabel>Delete session</MenuItemLabel>
        </MenuItem>
      </MenuContent>
    </Menu>
  ) : null;

  return (
    <>
      {showAttendance ? (
        <div className={styles.attendanceRow}>
          <TouchButton
            variant="primary"
            fullWidth
            onClick={onAttendance}
            data-testid="open-attendance"
          >
            Attendance
          </TouchButton>
          {menu}
        </div>
      ) : (
        menu
      )}

      <AppBottomSheet
        isOpen={changeOpen}
        onOpenChange={setChangeOpen}
        title="Change date/time"
      >
        <div className={styles.sheetStack}>
          <FormInput
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
            data-testid="session-change-starts-at"
          />
          <FormInput
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
            data-testid="session-change-ends-at"
          />
          {!timesValid ? (
            <p className={styles.sheetError}>
              End time must be later than start time.
            </p>
          ) : null}
          {updateMutation.isError ? (
            <p className={styles.sheetError} role="alert">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : "Could not update session."}
            </p>
          ) : null}
          <Button
            variant="primary"
            isDisabled={!timesValid}
            isPending={updateMutation.isPending}
            data-testid="confirm-change-session"
            onClick={() => updateMutation.mutate()}
          >
            Save changes
          </Button>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete session"
      >
        <div className={styles.sheetStack}>
          <p className={styles.sheetCopy}>
            Cancel this session? Enrolled students get an in-app notification
            and a card in the batch chat.
          </p>
          <Button
            variant="danger"
            isPending={deleteMutation.isPending}
            data-testid="confirm-delete-session"
            onClick={() => deleteMutation.mutate()}
          >
            Delete session
          </Button>
          <Button
            variant="quiet"
            isDisabled={deleteMutation.isPending}
            onClick={() => setDeleteOpen(false)}
          >
            Keep session
          </Button>
        </div>
      </AppBottomSheet>
    </>
  );
}
