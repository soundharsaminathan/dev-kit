import { createElement } from "react";
import type { HeadingLevel, HeadingProps } from "./heading.types";

const headingTags: Record<HeadingLevel, `h${HeadingLevel}`> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

function Heading({ level = 1, children, ...props }: HeadingProps) {
  return createElement(headingTags[level], props, children);
}

export type { HeadingLevel, HeadingProps };
export { Heading };
