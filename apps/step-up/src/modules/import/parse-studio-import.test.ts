import { describe, expect, it } from "vitest";
import { parseStudioImportSheets } from "./parse-studio-import";

const LOCATIONS_SHEET = {
  sheet: "Locations",
  data: [
    [
      "Location name",
      "Address",
      "Latitude",
      "Longitude",
      "Description",
      "Amenities",
      "Opening hours",
      "Pricing blurb",
    ],
    [
      "Main Branch",
      "MG Road, Bengaluru",
      "12.9716",
      "77.5946",
      "Flagship studio",
      "Parking, Changing rooms",
      "Mon-Fri 09:00-18:00, Sun closed",
      "",
    ],
  ],
};

const STUDENTS_SHEET = {
  sheet: "Students",
  data: [
    ["Name", "Email", "Gender", "Age"],
    ["Ada Lovelace", "ada@example.com", "Female", 28],
    ["Alan Turing", "alan@example.com", "Male", 16],
  ],
};

const BATCHES_SHEET = {
  sheet: "Batches",
  data: [
    [
      "Batch name",
      "Category",
      "Branch name",
      "Dance styles",
      "Frequency",
      "Weekdays",
      "Start time",
      "End time",
      "Start date",
      "End date",
      "UTC offset minutes",
      "Capacity",
      "Enrollment mode",
      "Status",
    ],
    [
      "Kids Hip-Hop",
      "Kids",
      "Main Branch",
      "Hip-Hop, Jazz",
      "Weekly",
      "Mon, Wed",
      "16:00",
      "17:00",
      "2024-06-03",
      "2025-03-31",
      330,
      12,
      "Staff only",
      "Active",
    ],
  ],
};

const ENROLLMENTS_SHEET = {
  sheet: "Enrollments",
  data: [
    [
      "Student email",
      "Batch name",
      "Enrolled date",
      "Status",
      "Ended date",
      "End reason",
    ],
    ["ada@example.com", "Kids Hip-Hop", "2024-06-03", "Active", "", ""],
    [
      "alan@example.com",
      "Kids Hip-Hop",
      "2024-08-01",
      "Ended",
      "2025-01-15",
      "Switched batch",
    ],
  ],
};

const INVOICES_SHEET = {
  sheet: "Invoices & Payments",
  data: [
    [
      "Student email",
      "Batch name",
      "Amount",
      "Status",
      "Payment method",
      "Paid date",
      "Referral discount",
      "Studio discount",
      "Refunded amount",
      "Refunded date",
    ],
    [
      "ada@example.com",
      "Kids Hip-Hop",
      1500,
      "Paid",
      "Cash",
      "2024-06-03",
      100,
      0,
      0,
      "",
    ],
    [
      "alan@example.com",
      "",
      1800,
      "Refunded",
      "UPI",
      "2024-08-01",
      0,
      0,
      "",
      "2024-09-10",
    ],
  ],
};

const SESSIONS_SHEET = {
  sheet: "Sessions",
  data: [
    [
      "Batch name",
      "Date",
      "Start time",
      "End time",
      "Status",
      "Type",
      "Trainer email",
    ],
    [
      "Kids Hip-Hop",
      "2024-06-03",
      "16:00",
      "17:00",
      "Completed",
      "Regular",
      "",
    ],
    ["Kids Hip-Hop", "2024-06-05", "16:00", "", "Held", "Trial", ""],
    [
      "Kids Hip-Hop",
      "2024-07-01",
      "19:00",
      "20:00",
      "Cancelled",
      "Regular",
      "",
    ],
    [
      "Kids Hip-Hop",
      "2024-07-02",
      "21:00",
      "20:00",
      "Scheduled",
      "Regular",
      "",
    ],
    ["", "", "", "", "", "", ""],
  ],
};

const ATTENDANCE_SHEET = {
  sheet: "Attendance",
  data: [
    ["Batch name", "Student email", "Date", "Start time", "Status"],
    ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "16:00", "Present"],
    ["Kids Hip-Hop", "alan@example.com", "2024-06-05", "16:00", "Absent"],
  ],
};

describe("parseStudioImportSheets", () => {
  it("detects and parses all seven sheets", () => {
    const result = parseStudioImportSheets([
      LOCATIONS_SHEET,
      STUDENTS_SHEET,
      BATCHES_SHEET,
      SESSIONS_SHEET,
      ENROLLMENTS_SHEET,
      INVOICES_SHEET,
      ATTENDANCE_SHEET,
    ]);

    expect(result.found).toEqual({
      students: true,
      locations: true,
      batches: true,
      sessions: true,
      enrollments: true,
      invoices: true,
      attendance: true,
    });
    expect(result.sheetErrors).toEqual({});
    expect(result.crossSheetErrors).toEqual([]);
    expect(result.students).toHaveLength(2);
    expect(result.studentsInvalidRows).toEqual([]);

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]).toMatchObject({
      name: "Kids Hip-Hop",
      category: "KIDS",
      branchName: "Main Branch",
      danceStyles: ["Hip-Hop", "Jazz"],
      frequency: "WEEKLY",
      weekdays: [1, 3],
      startTime: "16:00",
      endTime: "17:00",
      startDate: "2024-06-03",
      endDate: "2025-03-31",
      utcOffsetMinutes: 330,
      capacity: 12,
      enrollmentMode: "STAFF_ONLY",
      active: true,
      monthlyPlanName: null,
      quarterlyPlanName: null,
    });

    expect(result.enrollments).toEqual([
      {
        studentEmail: "ada@example.com",
        batchName: "Kids Hip-Hop",
        enrolledAt: "2024-06-03",
        status: "ACTIVE",
        endedAt: null,
        endReason: null,
        planName: null,
      },
      {
        studentEmail: "alan@example.com",
        batchName: "Kids Hip-Hop",
        enrolledAt: "2024-08-01",
        status: "ENDED",
        endedAt: "2025-01-15",
        endReason: "Switched batch",
        planName: null,
      },
    ]);

    expect(result.sessions).toEqual([
      {
        batchName: "Kids Hip-Hop",
        date: "2024-06-03",
        startTime: "16:00",
        endTime: "17:00",
        status: "COMPLETED",
        type: "REGULAR",
        trainerEmail: null,
      },
      {
        batchName: "Kids Hip-Hop",
        date: "2024-06-05",
        startTime: "16:00",
        endTime: "17:00",
        status: "COMPLETED",
        type: "TRIAL",
        trainerEmail: null,
      },
      {
        batchName: "Kids Hip-Hop",
        date: "2024-07-01",
        startTime: "19:00",
        endTime: "20:00",
        status: "CANCELLED",
        type: "REGULAR",
        trainerEmail: null,
      },
    ]);
    expect(result.sessionsInvalidRows).toEqual([5]);

    expect(result.invoices).toEqual([
      {
        studentEmail: "ada@example.com",
        batchName: "Kids Hip-Hop",
        amount: 1500,
        status: "PAID",
        paymentMethod: "CASH",
        paidAt: "2024-06-03",
        referralDiscount: 100,
        studioDiscount: 0,
        refundedAmount: 0,
        refundedAt: null,
        planName: null,
      },
      {
        studentEmail: "alan@example.com",
        batchName: null,
        amount: 1800,
        status: "REFUNDED",
        paymentMethod: "UPI_MANUAL",
        paidAt: "2024-08-01",
        referralDiscount: 0,
        studioDiscount: 0,
        refundedAmount: 1800,
        refundedAt: "2024-09-10",
        planName: null,
      },
    ]);
    expect(result.invoicesInvalidRows).toEqual([]);

    expect(result.attendance).toEqual([
      {
        batchName: "Kids Hip-Hop",
        studentEmail: "ada@example.com",
        date: "2024-06-03",
        startTime: "16:00",
        status: "PRESENT",
      },
      {
        batchName: "Kids Hip-Hop",
        studentEmail: "alan@example.com",
        date: "2024-06-05",
        startTime: "16:00",
        status: "ABSENT",
      },
    ]);
    expect(result.attendanceInvalidRows).toEqual([]);

    expect(result.locations).toEqual([
      {
        name: "Main Branch",
        address: "MG Road, Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
        description: "Flagship studio",
        amenities: ["Parking", "Changing rooms"],
        openingHours: {
          days: [
            { day: 0, closed: true },
            { day: 1, open: "09:00", close: "18:00" },
            { day: 2, open: "09:00", close: "18:00" },
            { day: 3, open: "09:00", close: "18:00" },
            { day: 4, open: "09:00", close: "18:00" },
            { day: 5, open: "09:00", close: "18:00" },
          ],
        },
        pricingBlurb: null,
      },
    ]);
    expect(result.locationsInvalidRows).toEqual([]);
  });

  it("treats a missing refunded amount on Refunded as full refund", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Payments",
        data: [
          ["Student email", "Amount", "Status", "Payment method", "Paid date"],
          ["ada@example.com", 1200, "Refunded", "Cash", "2024-01-05"],
        ],
      },
    ]);

    expect(result.invoices[0]?.refundedAmount).toBe(1200);
  });

  it("skips invalid invoice rows", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Invoices",
        data: [
          ["Student email", "Amount", "Status", "Paid date"],
          ["ada@example.com", 0, "Paid", "2024-01-05"],
          ["not-an-email", 500, "Paid", "2024-01-05"],
          ["ada@example.com", -100, "Pending", ""],
          ["alan@example.com", 500, "Paid", ""],
          ["grace@example.com", 400, "Paid", "2024-02-02"],
        ],
      },
    ]);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0]?.studentEmail).toBe("grace@example.com");
    expect(result.invoicesInvalidRows).toEqual([2, 3, 4, 5]);
  });

  it("defaults batch fields when columns are omitted", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          ["Batch name", "Category"],
          ["Adults Jazz", "Adults"],
        ],
      },
    ]);

    expect(result.batches[0]).toMatchObject({
      category: "ADULTS",
      frequency: "WEEKLY",
      weekdays: [1, 3, 5],
      startTime: "09:00",
      endTime: "10:00",
      capacity: 20,
      enrollmentMode: "STAFF_ONLY",
      active: true,
      branchName: null,
      utcOffsetMinutes: null,
    });
  });

  it("marks ended batches inactive", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          ["Batch name", "Category", "Status"],
          ["2023 Batch", "Kids", "Ended"],
          ["2024 Batch", "Kids", "Active"],
        ],
      },
    ]);

    expect(result.batches.map((batch) => [batch.name, batch.active])).toEqual([
      ["2023 Batch", false],
      ["2024 Batch", true],
    ]);
  });

  it("flags invalid enrollments", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Enrollments",
        data: [
          [
            "Student email",
            "Batch name",
            "Enrolled date",
            "Status",
            "Ended date",
          ],
          ["bad-email", "Kids Hip-Hop", "2024-01-01", "Active", ""],
          ["ada@example.com", "Kids Hip-Hop", "2024-01-01", "Ended", ""],
          ["ada@example.com", "Kids Hip-Hop", "not-a-date", "Active", ""],
          ["alan@example.com", "Kids Hip-Hop", "2024-01-01", "Active", ""],
        ],
      },
    ]);

    expect(result.enrollments).toHaveLength(1);
    expect(result.enrollments[0]?.studentEmail).toBe("alan@example.com");
    expect(result.enrollmentsInvalidRows).toEqual([2, 3, 4]);
  });

  it("reports sheet errors instead of throwing", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          ["Name only", "No category"],
          ["X", "Y"],
        ],
      },
    ]);

    expect(result.found.batches).toBe(true);
    expect(result.batches).toHaveLength(0);
    expect(result.sheetErrors.batches).toMatch(/Batch name/);
  });

  it("recognizes sheets by name fallback", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "My Students",
        data: [
          ["Name", "Email", "Gender", "Age"],
          ["Ada", "ada@example.com", "Female", 30],
        ],
      },
    ]);
    expect(result.found.students).toBe(true);
    expect(result.students).toHaveLength(1);
  });

  it("recognizes the Invoices & Payments sheet by name", () => {
    const result = parseStudioImportSheets([
      { sheet: "Invoices & Payments", data: [["custom header"]] },
    ]);
    expect(result.found.invoices).toBe(true);
  });

  it("parses day-first dates and AM/PM times", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          [
            "Batch name",
            "Category",
            "Start time",
            "End time",
            "Start date",
            "End date",
          ],
          [
            "Evening",
            "Adults",
            "6:30 PM",
            "7:45 PM",
            "03/06/2024",
            "31/03/2025",
          ],
        ],
      },
    ]);

    expect(result.batches[0]).toMatchObject({
      startTime: "18:30",
      endTime: "19:45",
      startDate: "2024-06-03",
      endDate: "2025-03-31",
    });
  });

  it("defaults attendance status to Present and accepts aliases", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Attendance",
        data: [
          ["Batch name", "Student email", "Date", "Status"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "P"],
          ["Kids Hip-Hop", "alan@example.com", "2024-06-03", ""],
          ["Kids Hip-Hop", "grace@example.com", "2024-06-03", "A"],
          ["Kids Hip-Hop", "marie@example.com", "2024-06-03", "Attended"],
        ],
      },
    ]);

    expect(
      result.attendance.map((row) => [row.studentEmail, row.status]),
    ).toEqual([
      ["ada@example.com", "PRESENT"],
      ["alan@example.com", "PRESENT"],
      ["grace@example.com", "ABSENT"],
      ["marie@example.com", "PRESENT"],
    ]);
  });

  it("flags invalid attendance rows and dedupes", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Attendance",
        data: [
          ["Batch name", "Student email", "Date", "Status"],
          ["Kids Hip-Hop", "bad-email", "2024-06-03", "Present"],
          ["", "ada@example.com", "2024-06-03", "Present"],
          ["Kids Hip-Hop", "ada@example.com", "not-a-date", "Present"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "Present"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "Absent"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-04", "Present"],
        ],
      },
    ]);

    expect(result.attendance).toHaveLength(2);
    expect(result.attendance[0]).toMatchObject({
      studentEmail: "ada@example.com",
      date: "2024-06-03",
      status: "PRESENT",
    });
    expect(result.attendance[1]).toMatchObject({
      studentEmail: "ada@example.com",
      date: "2024-06-04",
      status: "PRESENT",
    });
    expect(result.attendanceInvalidRows).toEqual([2, 3, 4, 6]);
  });

  it("detects an attendance sheet before an enrollments sheet when a Date column exists", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Roster 2024",
        data: [
          ["Batch name", "Student email", "Date", "Status"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "Present"],
        ],
      },
    ]);

    expect(result.found.attendance).toBe(true);
    expect(result.found.enrollments).toBe(false);
    expect(result.attendance).toHaveLength(1);
  });

  it("recognizes the Attendance sheet by name fallback", () => {
    const result = parseStudioImportSheets([
      { sheet: "Attendance Register", data: [["custom header"]] },
    ]);
    expect(result.found.attendance).toBe(true);
  });

  it("detects a sessions sheet when Start time is present without a student email", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Class List 2024",
        data: [
          ["Batch name", "Date", "Start time", "Status"],
          ["Kids Hip-Hop", "2024-06-03", "16:00", "Completed"],
        ],
      },
    ]);

    expect(result.found.sessions).toBe(true);
    expect(result.found.attendance).toBe(false);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      batchName: "Kids Hip-Hop",
      date: "2024-06-03",
      startTime: "16:00",
      status: "COMPLETED",
    });
  });

  it("defaults session end time to start plus 60 minutes and accepts aliases", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Sessions",
        data: [
          ["Batch name", "Date", "Start time", "Type"],
          ["Kids Hip-Hop", "2024-06-03", "16:00", "Demo"],
          ["Kids Hip-Hop", "2024-06-03", "23:00", "Trial"],
        ],
      },
    ]);

    expect(result.sessions.map((row) => row.endTime)).toEqual([
      "17:00",
      "00:00",
    ]);
    expect(result.sessions[0]?.type).toBe("TRIAL");
    expect(result.sessions[0]?.status).toBe("COMPLETED");
  });

  it("flags invalid and duplicate sessions", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Sessions",
        data: [
          ["Batch name", "Date", "Start time", "End time", "Trainer email"],
          ["Kids Hip-Hop", "not-a-date", "16:00", "", ""],
          ["", "2024-06-03", "16:00", "", ""],
          ["Kids Hip-Hop", "2024-06-03", "", "", ""],
          ["Kids Hip-Hop", "2024-06-03", "16:00", "", "not-an-email"],
          ["Kids Hip-Hop", "2024-06-03", "16:00", "17:00", ""],
          ["Kids Hip-Hop", "2024-06-03", "16:00", "17:30", ""],
          ["Kids Hip-Hop", "2024-06-04", "17:00", "16:00", ""],
          [
            "Kids Hip-Hop",
            "2024-06-04",
            "18:00",
            "19:00",
            "trainer@example.com",
          ],
        ],
      },
    ]);

    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]?.trainerEmail).toBeNull();
    expect(result.sessions[1]).toMatchObject({
      startTime: "18:00",
      trainerEmail: "trainer@example.com",
    });
    expect(result.sessionsInvalidRows).toEqual([2, 3, 4, 5, 7, 8]);
  });

  it("parses attendance Start time and treats start times as distinct", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Attendance",
        data: [
          ["Batch name", "Student email", "Date", "Start time", "Status"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "16:00", "Present"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "16:00", "Absent"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "18:00", "Present"],
        ],
      },
    ]);

    expect(result.attendance).toHaveLength(2);
    expect(result.attendance[0]).toMatchObject({
      startTime: "16:00",
      status: "PRESENT",
    });
    expect(result.attendance[1]).toMatchObject({ startTime: "18:00" });
    expect(result.attendanceInvalidRows).toEqual([3]);
  });

  it("parses locations with defaults and keeps unparseable opening hours as notes", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Locations",
        data: [
          [
            "Location name",
            "Address",
            "Latitude",
            "Opening hours",
            "Pricing blurb",
          ],
          ["West Studio", "", "abc", "Mon 10:00-19:00", "INR 1,500/mo"],
          ["East Studio", "", "", "Open every evening", ""],
          ["South Studio", "", "", "Sat 10:00-14:00", ""],
        ],
      },
    ]);

    expect(result.locations[0]).toMatchObject({
      name: "West Studio",
      address: null,
      latitude: null,
      longitude: null,
      pricingBlurb: "INR 1,500/mo",
      openingHours: { days: [{ day: 1, open: "10:00", close: "19:00" }] },
    });
    expect(result.locations[1]?.openingHours).toEqual({
      notes: "Open every evening",
    });
    expect(result.locations[2]?.openingHours).toEqual({
      days: [{ day: 6, open: "10:00", close: "14:00" }],
    });
    expect(result.locationsInvalidRows).toEqual([]);
  });

  it("flags blank and duplicate location names", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Locations",
        data: [
          ["Location name", "Address"],
          ["Main Branch", "MG Road"],
          ["", "Somewhere"],
          ["main branch", "Other road"],
          ["Second Branch", ""],
        ],
      },
    ]);

    expect(result.locations.map((row) => row.name)).toEqual([
      "Main Branch",
      "Second Branch",
    ]);
    expect(result.locationsInvalidRows).toEqual([3, 4]);
  });

  it("recognizes a Branches sheet as locations by name fallback", () => {
    const result = parseStudioImportSheets([
      { sheet: "Branches", data: [["custom header"]] },
    ]);
    expect(result.found.locations).toBe(true);
  });

  it("blocks multiple batch names across sheets", () => {
    const result = parseStudioImportSheets([
      BATCHES_SHEET,
      {
        sheet: "Enrollments",
        data: [
          ["Student email", "Batch name", "Enrolled date", "Status"],
          ["ada@example.com", "Other Batch", "2024-01-01", "Active"],
        ],
      },
    ]);
    expect(result.crossSheetErrors).toContain(
      "Import one batch at a time. All rows must use the same batch name.",
    );
  });

  it("blocks attendance without start time", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Attendance",
        data: [
          ["Batch name", "Student email", "Date", "Status"],
          ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "Present"],
        ],
      },
    ]);
    expect(result.crossSheetErrors).toContain(
      "Attendance rows need a Start time that matches a Sessions row in this workbook.",
    );
  });

  it("parses plan name columns on batches, enrollments, and invoices", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          [
            "Batch name",
            "Category",
            "Monthly plan name",
            "Quarterly plan name",
            "Start time",
            "End time",
          ],
          [
            "Kids Hip-Hop",
            "Kids",
            "Kids Monthly",
            "Kids Quarterly",
            "16:00",
            "17:00",
          ],
        ],
      },
      {
        sheet: "Enrollments",
        data: [
          [
            "Student email",
            "Batch name",
            "Enrolled date",
            "Status",
            "Plan name",
          ],
          [
            "ada@example.com",
            "Kids Hip-Hop",
            "2024-06-03",
            "Active",
            "Kids Monthly",
          ],
        ],
      },
      {
        sheet: "Invoices & Payments",
        data: [
          [
            "Student email",
            "Batch name",
            "Amount",
            "Status",
            "Paid date",
            "Plan name",
          ],
          [
            "ada@example.com",
            "Kids Hip-Hop",
            1500,
            "Paid",
            "2024-06-03",
            "Kids Monthly",
          ],
        ],
      },
    ]);

    expect(result.sheetErrors).toEqual({});
    expect(result.batches[0]).toMatchObject({
      monthlyPlanName: "Kids Monthly",
      quarterlyPlanName: "Kids Quarterly",
    });
    expect(result.enrollments[0]?.planName).toBe("Kids Monthly");
    expect(result.invoices[0]?.planName).toBe("Kids Monthly");
  });

  it("rejects batches that only set one of monthly/quarterly plan names", () => {
    const result = parseStudioImportSheets([
      {
        sheet: "Batches",
        data: [
          [
            "Batch name",
            "Category",
            "Monthly plan name",
            "Quarterly plan name",
            "Start time",
            "End time",
          ],
          ["Kids Hip-Hop", "Kids", "Kids Monthly", "", "16:00", "17:00"],
        ],
      },
    ]);
    expect(result.batches).toEqual([]);
    expect(result.batchesInvalidRows).toEqual([2]);
  });
});
