import { Accordion } from "@dev-ui/components/accordion";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "@dev-ui/components/disclosure";

const items = [
  {
    id: "getting-started",
    question: "How do I get started?",
    answer:
      "Install the package with your preferred package manager, then import the components you need.",
  },
  {
    id: "customization",
    question: "Can I customize the components?",
    answer:
      "Yes. Components use design tokens and SCSS modules so you can match your design system.",
  },
  {
    id: "typescript",
    question: "Is TypeScript supported?",
    answer:
      "The library is written in TypeScript and ships full type definitions for all components.",
  },
];

type AccordionPlaygroundProps = {
  allowsMultipleExpanded?: boolean;
  defaultExpandedKey?:
    | "none"
    | "getting-started"
    | "customization"
    | "typescript";
};

export default function AccordionPlayground({
  allowsMultipleExpanded = false,
  defaultExpandedKey = "none",
}: AccordionPlaygroundProps = {}) {
  return (
    <Accordion
      className="accordion-demo"
      allowsMultipleExpanded={allowsMultipleExpanded}
      {...(defaultExpandedKey !== "none"
        ? { defaultExpandedKeys: [defaultExpandedKey] }
        : {})}
    >
      {items.map((item) => (
        <Disclosure key={item.id} id={item.id}>
          <DisclosureTrigger>{item.question}</DisclosureTrigger>
          <DisclosurePanel>{item.answer}</DisclosurePanel>
        </Disclosure>
      ))}
    </Accordion>
  );
}
