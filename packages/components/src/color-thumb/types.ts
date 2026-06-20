import type { Ref } from "react";

export type ColorThumbProps = React.ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>;
};
