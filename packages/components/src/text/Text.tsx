import type { TextProps } from "./text.types";

function Text({ slot, children, ...props }: TextProps) {
  return (
    <span data-text="" data-slot={slot} {...props}>
      {children}
    </span>
  );
}

export type { TextProps };
export { Text };
