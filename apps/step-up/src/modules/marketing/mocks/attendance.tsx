import { STUDENTS } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const CHIPS = [
  { id: "all", label: "All", on: true },
  { id: "unmarked", label: "Unmarked", on: false },
  { id: "present", label: "Present", on: false },
  { id: "absent", label: "Absent", on: false },
];

function MarkPills({
  status,
}: {
  status: (typeof STUDENTS)[number]["status"];
}) {
  return (
    <span className={styles.pills} data-status={status}>
      <span
        className={styles.pill}
        data-on={status === "present" ? "true" : undefined}
      >
        Present
      </span>
      <span
        className={styles.pill}
        data-danger="true"
        data-on={status === "absent" ? "true" : undefined}
      >
        Absent
      </span>
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: (typeof STUDENTS)[number]["status"];
}) {
  if (status === "present") {
    return (
      <span className={styles.badge} data-tone="ok">
        Present
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className={styles.badge} data-tone="bad">
        Absent
      </span>
    );
  }
  return (
    <span className={styles.badge} data-tone="warn">
      Unmarked
    </span>
  );
}

export function AttendanceMock() {
  return (
    <MockApp
      nav="attendance"
      title="Attendance"
      subtitle="Hip Hop Intermediate · Today 6:00 PM"
      showBack
    >
      <div className={styles.search}>Search roster</div>
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
        <span className={`${styles.btn} ${styles.btnSm} ${styles.onlyDesktop}`}>
          Mark all unmarked present
        </span>
      </div>

      <div className={styles.onlyMobile}>
        <div className={styles.roster}>
          {STUDENTS.map((student) => (
            <div key={student.id} className={styles.rosterRow}>
              <span className={styles.avatar}>{student.initials}</span>
              <span className={`${styles.rowTitle} ${styles.grow}`}>
                {student.name}
              </span>
              <MarkPills status={student.status} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.onlyDesktop}>
        <div className={styles.roster}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th />
                <th>Student</th>
                <th>Status</th>
                <th>Mark</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((student) => (
                <tr key={student.id}>
                  <td>
                    <span
                      className={styles.check}
                      data-on={
                        student.status === "present" ? "true" : undefined
                      }
                    />
                  </td>
                  <td className={styles.rowTitle}>{student.name}</td>
                  <td>
                    <StatusBadge status={student.status} />
                  </td>
                  <td>
                    <MarkPills status={student.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MockApp>
  );
}
