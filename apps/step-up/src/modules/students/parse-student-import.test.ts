import { describe, expect, it } from "vitest";
import {
  parseStudentImportRows,
  STUDENT_IMPORT_MAX,
} from "./parse-student-import";

describe("parseStudentImportRows", () => {
  it("parses required columns and exact ages", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age"],
      ["Ada Lovelace", "ada@example.com", "Female", 28],
      ["Alan Turing", "alan@example.com", "MALE", "16"],
    ]);

    expect(result.invalidRows).toEqual([]);
    expect(result.students).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: "FEMALE",
        age: 28,
      },
      {
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        age: 16,
      },
    ]);
  });

  it("rejects spreadsheets missing required headers", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Phone"],
        ["Ada", "ada@example.com", "555"],
      ]),
    ).toThrow(/Name.*Email.*Gender.*Age/);
  });

  it("skips invalid rows and keeps valid ones", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age"],
      ["Ada Lovelace", "ada@example.com", "Female", 28],
      ["Missing Gender", "missing@example.com", "", 8],
      ["Bad Email", "not-an-email", "Male", 40],
      ["Range Instead Of Age", "range@example.com", "Female", "20-40"],
    ]);

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.email).toBe("ada@example.com");
    expect(result.invalidRows).toEqual([3, 4, 5]);
  });

  it("throws when every row is invalid", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Gender", "Age"],
        ["", "bad", "Nope", "Nope"],
      ]),
    ).toThrow(/No valid students found/);
  });

  it("enforces the import cap", () => {
    const rows: Array<Array<string | number>> = [
      ["Name", "Email", "Gender", "Age"],
    ];
    for (let i = 0; i < STUDENT_IMPORT_MAX + 1; i += 1) {
      rows.push([`Student ${i}`, `s${i}@example.com`, "Female", 28]);
    }
    expect(() => parseStudentImportRows(rows)).toThrow(
      `Import up to ${STUDENT_IMPORT_MAX} students at a time.`,
    );
  });
});
