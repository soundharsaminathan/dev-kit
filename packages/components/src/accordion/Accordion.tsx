import { cn } from "@dev-ui/core";
import { useDisclosureGroupState } from "@react-stately/disclosure";
import styles from "./accordion.module.scss";
import type { AccordionProps } from "./accordion.types";
import { AccordionContext } from "./accordion-context";

function Accordion({ children, className, ref, ...props }: AccordionProps) {
  const state = useDisclosureGroupState(props);

  return (
    <AccordionContext.Provider value={state}>
      <div ref={ref} data-accordion="" className={cn(styles.root, className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export type { AccordionProps } from "./accordion.types";
export { Accordion };
