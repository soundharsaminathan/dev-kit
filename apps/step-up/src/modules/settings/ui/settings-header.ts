import { createContext, useContext, useLayoutEffect, useMemo } from "react";

export type SettingsHeaderRegistration = {
  dirty: boolean;
  pending?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
};

export const SettingsHeaderContext = createContext<
  ((next: SettingsHeaderRegistration | null) => void) | null
>(null);

export function useSettingsHeader(
  registration: SettingsHeaderRegistration | null,
) {
  const setHeader = useContext(SettingsHeaderContext);
  const dirty = registration?.dirty ?? false;
  const pending = registration?.pending ?? false;
  const onSave = registration?.onSave;
  const onDiscard = registration?.onDiscard;
  const saveLabel = registration?.saveLabel;

  const snapshot = useMemo(
    () =>
      onSave
        ? {
            dirty,
            pending,
            onSave,
            ...(onDiscard ? { onDiscard } : {}),
            ...(saveLabel ? { saveLabel } : {}),
          }
        : null,
    [dirty, pending, onSave, onDiscard, saveLabel],
  );

  useLayoutEffect(() => {
    setHeader?.(snapshot);
    return () => setHeader?.(null);
  }, [setHeader, snapshot]);
}
