import { BATCHES } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const CHIPS = [
  { id: "all", label: "All", on: true },
  { id: "active", label: "Active", on: false },
  { id: "kids", label: "Kids", on: false },
  { id: "adults", label: "Adults", on: false },
];

export function BatchesMock() {
  return (
    <MockApp
      nav="batches"
      title="Batches"
      action={<span className={styles.btn}>New batch</span>}
    >
      <div className={styles.search}>Search batches</div>
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <span
            key={chip.id}
            className={styles.chip}
            data-on={chip.on ? "true" : undefined}
          >
            {chip.label}
          </span>
        ))}
      </div>
      <div className={styles.batchesGrid}>
        {BATCHES.map((batch) => (
          <div key={batch.id} className={styles.batchCard}>
            <div className={styles.batchMedia} aria-hidden />
            <div className={styles.batchBody}>
              <p className={styles.batchCat}>{batch.category}</p>
              <p className={styles.batchName}>{batch.name}</p>
              <p className={styles.rowMeta}>
                {batch.enrolled} enrolled · {batch.capacity - batch.enrolled}{" "}
                seats left
              </p>
              <p className={styles.rowMeta}>{batch.schedule}</p>
              <p className={styles.rowMeta}>
                {batch.branch} · Coach {batch.trainer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </MockApp>
  );
}
