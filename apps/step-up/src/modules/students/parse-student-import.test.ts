import { describe, expect, it } from "vitest";
import {
  parseStudentImportRows,
  STUDENT_IMPORT_MAX,
} from "./parse-student-import";

const EMPTY_ROW = {
  name: "",
  email: "",
  gender: "FEMALE",
  age: null,
  dateOfBirth: null,
  phone: null,
  guardianName: null,
  alternateMobile: null,
};

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
        dateOfBirth: null,
        phone: null,
        guardianName: null,
        alternateMobile: null,
      },
      {
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        age: 16,
        dateOfBirth: null,
        phone: null,
        guardianName: null,
        alternateMobile: null,
      },
    ]);
  });

  it("accepts date of birth instead of age", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Date of birth"],
      ["Ada Lovelace", "ada@example.com", "Female", "2010-06-20"],
      [
        "Alan Turing",
        "alan@example.com",
        "Male",
        new Date("2012-04-05T00:00:00Z"),
      ],
    ]);

    expect(result.invalidRows).toEqual([]);
    expect(result.students).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        gender: "FEMALE",
        age: null,
        dateOfBirth: "2010-06-20",
        phone: null,
        guardianName: null,
        alternateMobile: null,
      },
      {
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        age: null,
        dateOfBirth: "2012-04-05",
        phone: null,
        guardianName: null,
        alternateMobile: null,
      },
    ]);
  });

  it("normalizes day-first date of birth formats", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "DOB"],
      ["Ada Lovelace", "ada@example.com", "Female", "20/06/2010"],
      ["Alan Turing", "alan@example.com", "Male", "05-04-2012"],
    ]);

    expect(result.students.map((row) => row.dateOfBirth)).toEqual([
      "2010-06-20",
      "2012-04-05",
    ]);
  });

  it("rejects future or malformed dates of birth", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Date of birth"],
      ["Future Kid", "future@example.com", "Female", "2099-01-01"],
      ["Bad Date", "bad@example.com", "Male", "not-a-date"],
      ["Ada Lovelace", "ada@example.com", "Female", "2000-01-15"],
    ]);

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.name).toBe("Ada Lovelace");
    expect(result.invalidRows).toEqual([2, 3]);
  });

  it("rejects rows missing both age and date of birth", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age", "Date of birth"],
      ["No Age", "noage@example.com", "Female", "", ""],
      ["Ada Lovelace", "ada@example.com", "Female", 28, ""],
    ]);

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.email).toBe("ada@example.com");
    expect(result.invalidRows).toEqual([2]);
  });

  it("rejects spreadsheets missing required headers", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Phone"],
        ["Ada", "ada@example.com", "555"],
      ]),
    ).toThrow(/Name.*Email.*Gender/);
  });

  it("rejects spreadsheets without age or date of birth columns", () => {
    expect(() =>
      parseStudentImportRows([
        ["Name", "Email", "Gender", "Phone"],
        ["Ada", "ada@example.com", "Female", "555"],
      ]),
    ).toThrow(/Age.*Date of birth/);
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

  it("reads optional mobile numbers from Mobile or Phone columns", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age", "Mobile"],
      ["Ada Lovelace", "ada@example.com", "Female", 28, "+91 91234 56789"],
      ["Alan Turing", "alan@example.com", "Male", 16, 9876543210],
      ["Grace Hopper", "grace@example.com", "Female", 40, ""],
    ]);

    expect(result.invalidRows).toEqual([]);
    expect(result.students).toEqual([
      {
        ...EMPTY_ROW,
        name: "Ada Lovelace",
        email: "ada@example.com",
        age: 28,
        phone: "+91 91234 56789",
      },
      {
        ...EMPTY_ROW,
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        age: 16,
        phone: "9876543210",
      },
      {
        ...EMPTY_ROW,
        name: "Grace Hopper",
        email: "grace@example.com",
        age: 40,
        phone: null,
      },
    ]);
  });

  it("reads optional guardian name and alternate mobile columns", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age", "Guardian name", "Alternate mobile"],
      [
        "Ada Lovelace",
        "ada@example.com",
        "Female",
        28,
        "Parent One",
        "9876543210",
      ],
      ["Alan Turing", "alan@example.com", "Male", 16, "", ""],
    ]);

    expect(result.invalidRows).toEqual([]);
    expect(result.students).toEqual([
      {
        ...EMPTY_ROW,
        name: "Ada Lovelace",
        email: "ada@example.com",
        age: 28,
        guardianName: "Parent One",
        alternateMobile: "9876543210",
      },
      {
        ...EMPTY_ROW,
        name: "Alan Turing",
        email: "alan@example.com",
        gender: "MALE",
        age: 16,
        guardianName: null,
        alternateMobile: null,
      },
    ]);
  });

  it("imports without a mobile column", () => {
    const result = parseStudentImportRows([
      ["Name", "Email", "Gender", "Age"],
      ["Ada Lovelace", "ada@example.com", "Female", 28],
    ]);

    expect(result.students[0]?.phone).toBeNull();
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
