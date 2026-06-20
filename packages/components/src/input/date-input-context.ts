import type { DateFieldState, TimeFieldState } from "@react-stately/datepicker";
import { createContext, useContext } from "react";

type DateInputContextValue =
  | {
      kind: "date";
      state: DateFieldState;
    }
  | {
      kind: "time";
      state: TimeFieldState;
    };

const DateInputContext = createContext<DateInputContextValue | null>(null);

function useDateInputContext(component: string): DateInputContextValue {
  const context = useContext(DateInputContext);
  if (!context) {
    throw new Error(`${component} must be used within DateField or TimeField`);
  }
  return context;
}

export type { DateInputContextValue };
export { DateInputContext, useDateInputContext };
