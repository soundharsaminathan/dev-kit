import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_PREVIEW } from "./content";
import {
  StudentDiscoverPreview,
  StudentHomePreview,
  StudentProfilePreview,
} from "./preview-mocks";
import styles from "./preview.module.scss";

export function StudentPreview() {
  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="preview-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="preview-headline" className={shared.title}>
            {STUDENT_PREVIEW.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_PREVIEW.support}</p>
        </Reveal>
        <Reveal delay={80}>
          <div className={styles.frame}>
            <div className={styles.chrome}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.screens}>
              <figure className={styles.screen}>
                <div className={styles.device}>
                  <StudentHomePreview />
                </div>
                <figcaption className={styles.caption}>
                  {STUDENT_PREVIEW.home}
                </figcaption>
              </figure>
              <figure className={styles.screen}>
                <div className={styles.device}>
                  <StudentDiscoverPreview />
                </div>
                <figcaption className={styles.caption}>
                  {STUDENT_PREVIEW.discover}
                </figcaption>
              </figure>
              <figure className={styles.screen}>
                <div className={styles.device}>
                  <StudentProfilePreview />
                </div>
                <figcaption className={styles.caption}>
                  {STUDENT_PREVIEW.profile}
                </figcaption>
              </figure>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
