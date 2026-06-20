import type { ReactElement } from "react";

export type FileTriggerProps = {
  children: ReactElement;
  className?: string | undefined;
  onSelect?: ((files: FileList | null) => void) | undefined;
  accept?: string | undefined;
  allowsMultiple?: boolean | undefined;
  isDisabled?: boolean | undefined;
  allowsClearing?: boolean | undefined;
  clearLabel?: string | undefined;
};
