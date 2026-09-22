import { Switch } from "@dev-ui/components/switch";
import { Icon } from "@dev-ui/icons";
import { useState } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  applyHoursToWeekdays,
  copyPreviousDayHours,
  updateHoursDay,
} from "./location-edit-draft";
import styles from "./location-hours-editor.module.scss";
import { type OpeningHours, WEEKDAY_LABELS } from "./types";

type LocationHoursEditorProps = {
  hours: OpeningHours;
  onChange: (hours: OpeningHours) => void;
};

export function LocationHoursEditor({
  hours,
  onChange,
}: LocationHoursEditorProps) {
  const [focusDay, setFocusDay] = useState(1);
  const days = hours.days ?? [];

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <TouchButton
          size="sm"
          variant="quiet"
          onClick={() => onChange(applyHoursToWeekdays(hours))}
        >
          Apply to weekdays
        </TouchButton>
        <TouchButton
          size="sm"
          variant="quiet"
          isDisabled={focusDay <= 0}
          onClick={() => onChange(copyPreviousDayHours(hours, focusDay))}
        >
          Copy previous day
        </TouchButton>
      </div>

      <table className={styles.table}>
        <caption className={styles.srOnly}>Opening hours</caption>
        <thead>
          <tr className={styles.head}>
            <th scope="col">Day</th>
            <th scope="col">Status</th>
            <th scope="col">Opens</th>
            <th scope="col">Closes</th>
            <th scope="col" className={styles.srOnly}>
              Copy previous
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, index) => {
            const closed = Boolean(day.closed);
            return (
              <tr
                key={day.day}
                className={styles.row}
                data-closed={closed ? "true" : undefined}
                onFocusCapture={() => setFocusDay(index)}
              >
                <th scope="row" className={styles.day}>
                  {WEEKDAY_LABELS[day.day]}
                </th>
                <td className={styles.status}>
                  <Switch
                    size="sm"
                    isSelected={!closed}
                    onChange={(isOpen) => {
                      setFocusDay(index);
                      onChange(
                        updateHoursDay(hours, index, { closed: !isOpen }),
                      );
                    }}
                  >
                    {closed ? "Closed" : "Open"}
                  </Switch>
                </td>
                <td className={styles.time} data-slot="open">
                  {closed ? (
                    <span className={styles.dash}>—</span>
                  ) : (
                    <input
                      className={styles.input}
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[day.day]} opens`}
                      value={day.open ?? "09:00"}
                      onChange={(event) => {
                        setFocusDay(index);
                        onChange(
                          updateHoursDay(hours, index, {
                            open: event.target.value,
                          }),
                        );
                      }}
                    />
                  )}
                </td>
                <td className={styles.time} data-slot="close">
                  {closed ? (
                    <span className={styles.dash}>—</span>
                  ) : (
                    <input
                      className={styles.input}
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[day.day]} closes`}
                      value={day.close ?? "21:00"}
                      onChange={(event) => {
                        setFocusDay(index);
                        onChange(
                          updateHoursDay(hours, index, {
                            close: event.target.value,
                          }),
                        );
                      }}
                    />
                  )}
                </td>
                <td className={styles.copy}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    aria-label={`Copy previous day onto ${WEEKDAY_LABELS[day.day]}`}
                    disabled={index === 0}
                    onClick={() => {
                      setFocusDay(index);
                      onChange(copyPreviousDayHours(hours, index));
                    }}
                  >
                    <Icon name="copy" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
