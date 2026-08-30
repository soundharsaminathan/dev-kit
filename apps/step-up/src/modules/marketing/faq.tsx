import { useEffect, useId, useState } from "react";
import { FAQ } from "./content";
import styles from "./faq.module.scss";
import { CaretDownIcon } from "./icons";
import shared from "./marketing.module.scss";
import { Reveal } from "./reveal";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className={styles.item}>
      <h3 className={styles.itemTitle}>
        <button
          id={buttonId}
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span>{question}</span>
          <CaretDownIcon className={styles.caret ?? ""} />
        </button>
      </h3>
      <section
        id={panelId}
        aria-labelledby={buttonId}
        hidden={!open}
        className={styles.panel}
      >
        <p className={styles.answer}>{answer}</p>
      </section>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "classa-faq-schema";
    script.text = JSON.stringify(FAQ_JSON_LD);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <section
      id="faq"
      className={`${shared.section} ${styles.faq}`}
      aria-labelledby="faq-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="faq-headline" className={shared.title}>
            {FAQ.headline}
          </h2>
        </Reveal>

        <div className={styles.list}>
          {FAQ.items.map((item, i) => (
            <Reveal key={item.q} delay={i * 40}>
              <FaqItem
                question={item.q}
                answer={item.a}
                open={openIndex === i}
                onToggle={() =>
                  setOpenIndex((current) => (current === i ? null : i))
                }
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
