import { describe, expect, it } from "vitest";
import {
  type BatchEnrollmentRow,
  filterRosterEnrollments,
} from "./batch-roster";

const rows: BatchEnrollmentRow[] = [
  {
    studentId: "a",
    isTrial: true,
    student: { id: "a", name: "Ada", email: "a@x" },
  },
  {
    studentId: "b",
    isTrial: false,
    student: { id: "b", name: "Bea", email: "b@x" },
  },
  {
    studentId: "c",
    student: { id: "c", name: "Cal", email: "c@x" },
  },
];

describe("filterRosterEnrollments", () => {
  it("returns all rows for all", () => {
    expect(filterRosterEnrollments(rows, "all")).toHaveLength(3);
  });

  it("keeps only trials", () => {
    expect(
      filterRosterEnrollments(rows, "trial").map((r) => r.studentId),
    ).toEqual(["a"]);
  });

  it("keeps non-trial members", () => {
    expect(
      filterRosterEnrollments(rows, "enrolled").map((r) => r.studentId),
    ).toEqual(["b", "c"]);
  });
});
