import { useEffect, useId, useState } from "react";
import { CaretDownIcon } from "@/modules/marketing/icons";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_FAQ } from "./content";
import styles from "./faq.module.scss";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: STUDENT_FAQ.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export function FaqItem({
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
        aria-hidden={!open}
        inert={!open}
        data-open={open}
        className={styles.panel}
      >
        <div className={styles.panelInner}>
          <p className={styles.answer}>{answer}</p>
        </div>
      </section>
    </div>
  );
}

export function StudentFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "classa-student-faq-schema";
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
      aria-labelledby="student-faq-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="student-faq-headline" className={shared.title}>
            {STUDENT_FAQ.headline}
          </h2>
        </Reveal>
        <div className={styles.list}>
          {STUDENT_FAQ.items.map((item, index) => (
            <Reveal key={item.q} delay={index * 30}>
              <FaqItem
                question={item.q}
                answer={item.a}
                open={openIndex === index}
                onToggle={() =>
                  setOpenIndex((current) => (current === index ? null : index))
                }
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
