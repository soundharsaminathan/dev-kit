import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const TEMPLATES = [
  { id: "batch", name: "Batch completion", meta: "Landscape · used this term" },
  { id: "contest", name: "Contest award", meta: "Landscape · Summer Showcase" },
];

function CertificatePreview() {
  return (
    <div className={styles.cert}>
      <span className={styles.certSeal}>RH</span>
      <p className={styles.certTitle}>Certificate of Achievement</p>
      <p className={styles.certSub}>Awarded to</p>
      <p className={styles.certTitle}>Iniya</p>
      <p className={styles.certSub}>
        Hip Hop Intermediate · Summer Showcase 2026
      </p>
    </div>
  );
}

export function CertificateMock() {
  return (
    <>
      <div className={`${styles.onlyMobile} ${styles.fill}`}>
        <MockApp
          nav="certificates"
          title="Certificates"
          subtitle="Templates used for batch completion and contest awards."
          action={<span className={styles.btn}>Add</span>}
        >
          <div className={styles.certList}>
            {TEMPLATES.map((item) => (
              <div key={item.id} className={styles.listCard}>
                <span className={styles.rowTitle}>{item.name}</span>
                <span className={styles.rowMeta}>{item.meta}</span>
              </div>
            ))}
            <CertificatePreview />
          </div>
        </MockApp>
      </div>

      <div className={`${styles.onlyDesktop} ${styles.fill}`}>
        <MockApp nav="certificates" title="Summer Showcase" hideSidebar>
          <div className={styles.designer}>
            <div className={styles.toolbar}>
              <span className={styles.toolGroup}>
                <span className={styles.tool} />
                <span className={styles.tool} />
                <span className={styles.tool} />
              </span>
              <span className={styles.toolGroup}>
                <span className={styles.tool} />
                <span className={styles.tool} />
              </span>
              <span className={styles.toolGroup}>
                <span className={styles.tool} />
                <span className={styles.tool} />
                <span className={styles.tool} />
              </span>
            </div>
            <div className={styles.workspaceGrid}>
              <div className={styles.canvas}>
                <CertificatePreview />
              </div>
              <div className={styles.inspector}>
                <p className={styles.inspectLabel}>Text</p>
                <span className={styles.inspectField} />
                <p className={styles.inspectLabel}>Size</p>
                <span className={styles.inspectField} />
                <p className={styles.inspectLabel}>Align</p>
                <span className={styles.inspectField} />
              </div>
            </div>
          </div>
        </MockApp>
      </div>
    </>
  );
}
