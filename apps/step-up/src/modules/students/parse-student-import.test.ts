import { describe, expect, it } from "vitest";
import {
  parseStudentImportRows,
  STUDENT_IMPORT_MAX,
} from "./parse-student-import";

describe("parseStudentImportRows", () => {
  it("parses required columns and human-readable gender/age values", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age Range"],
      ["Ada Lovelace", "ada@example.com", "Female", "20–40"],
      ["Alan Turing", "alan@example.com", "MALE", "TEN_TO_TWENTY"],
    ]);

    expect(result.invalidRows).toEqual([]);
    expect(result.students).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
      },
      {
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        ageRange: "TEN_TO_TWENTY",
      },
    ]);
  });

  it("rejects spreadsheets missing required headers", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Phone"],
        ["Ada", "ada@example.com", "555"],
      ]),
    ).toThrow(/Name.*Email.*Gender.*Age Range/);
  });

  it("skips invalid rows and keeps valid ones", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age Range"],
      ["Ada Lovelace", "ada@example.com", "Female", "20-40"],
      ["Missing Gender", "missing@example.com", "", "Under 10"],
      ["Bad Email", "not-an-email", "Male", "40+"],
    ]);

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.email).toBe("ada@example.com");
    expect(result.invalidRows).toEqual([3, 4]);
  });

  it("throws when every row is invalid", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Gender", "Age Range"],
        ["", "bad", "Nope", "Nope"],
      ]),
    ).toThrow(/No valid students found/);
  });

  it("enforces the import cap", () => {
    const rows: string[][] = [["Name", "Email", "Gender", "Age Range"]];
    for (let i = 0; i < STUDENT_IMPORT_MAX + 1; i += 1) {
      rows.push([`Student ${i}`, `s${i}@example.com`, "Female", "20-40"]);
    }
    expect(() => parseStudentImportRows(rows)).toThrow(
      `Import up to ${STUDENT_IMPORT_MAX} students at a time.`,
    );
  });
});
