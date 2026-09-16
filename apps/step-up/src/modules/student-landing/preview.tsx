import shared from "@/modules/marketing/marketing.module.scss";
import { AttendanceMock } from "@/modules/marketing/mocks/attendance";
import { ScheduleMock } from "@/modules/marketing/mocks/schedule";
import { StudentProfileMock } from "@/modules/marketing/mocks/student-profile";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_PREVIEW } from "./content";
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
              <div className={styles.screen}>
                <StudentProfileMock />
              </div>
              <div className={styles.screen}>
                <ScheduleMock />
              </div>
              <div className={styles.screen}>
                <AttendanceMock />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
