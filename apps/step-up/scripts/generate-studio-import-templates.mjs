import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      data,
    ]);
    const cen = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ]);
    parts.push(local);
    central.push(cen);
    offset += local.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...parts, centralBuf, end]);
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cell(ref, value) {
  if (value === "" || value === null || value === undefined) {
    return `<c r="${ref}"/>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
}

function colLetter(index) {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function sheetXml(rows) {
  const sheetRows = rows
    .map((cols, index) => {
      const rowNumber = index + 1;
      const cells = cols
        .map((value, colIndex) =>
          cell(`${colLetter(colIndex)}${rowNumber}`, value),
        )
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function buildWorkbook(sheets) {
  const contentTypesParts = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `  <Default Extension="xml" ContentType="application/xml"/>`,
    `  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
  ];
  for (let i = 0; i < sheets.length; i++) {
    contentTypesParts.push(
      `  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
  }
  contentTypesParts.push(`</Types>`);

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookSheets = sheets
    .map(
      (sheet, i) =>
        `    <sheet name="${esc(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("\n");
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${workbookSheets}
  </sheets>
</workbook>`;

  const workbookRelsParts = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
  ];
  for (let i = 0; i < sheets.length; i++) {
    workbookRelsParts.push(
      `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    );
  }
  workbookRelsParts.push(`</Relationships>`);

  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesParts.join("\n"), "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(workbookRelsParts.join("\n"), "utf8"),
    },
  ];
  sheets.forEach((sheet, i) => {
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(sheetXml(sheet.rows), "utf8"),
    });
  });
  return zipStore(files);
}

const outDir = path.join(__dirname, "..", "public", "templates");
fs.mkdirSync(outDir, { recursive: true });

const studioPath = path.join(outDir, "studio-import-template.xlsx");
const studioBuffer = buildWorkbook([
  {
    name: "Students",
    rows: [
      ["Name", "Email", "Gender", "Age", "Mobile"],
      ["Ada Lovelace", "ada@example.com", "Female", "28", ""],
    ],
  },
  {
    name: "Locations",
    rows: [
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
        "MG Road",
        "12.9716",
        "77.5946",
        "Flagship",
        "Parking",
        "",
        "",
      ],
    ],
  },
  {
    name: "Batches",
    rows: [
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
        "Monthly plan name",
        "Quarterly plan name",
      ],
      [
        "Kids Hip-Hop",
        "Kids",
        "Main Branch",
        "Hip-Hop",
        "Weekly",
        "Mon, Wed",
        "16:00",
        "17:00",
        "2024-06-03",
        "2025-03-31",
        "",
        "12",
        "Staff only",
        "Active",
        "Kids Monthly",
        "Kids Quarterly",
      ],
    ],
  },
  {
    name: "Sessions",
    rows: [
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
        "trainer@example.com",
      ],
      [
        "Kids Hip-Hop",
        "2024-06-05",
        "16:00",
        "17:00",
        "Completed",
        "Regular",
        "",
      ],
    ],
  },
  {
    name: "Enrollments",
    rows: [
      [
        "Student email",
        "Batch name",
        "Enrolled at",
        "Status",
        "Ended at",
        "End reason",
        "Plan name",
      ],
      [
        "ada@example.com",
        "Kids Hip-Hop",
        "2024-06-01",
        "Active",
        "",
        "",
        "Kids Monthly",
      ],
    ],
  },
  {
    name: "Invoices & Payments",
    rows: [
      [
        "Student email",
        "Batch name",
        "Amount",
        "Status",
        "Payment method",
        "Paid at",
        "Referral discount",
        "Studio discount",
        "Refunded amount",
        "Refunded at",
        "Plan name",
      ],
      [
        "ada@example.com",
        "Kids Hip-Hop",
        "2500",
        "Paid",
        "Cash",
        "2024-06-01",
        "0",
        "0",
        "0",
        "",
        "Kids Monthly",
      ],
    ],
  },
  {
    name: "Attendance",
    rows: [
      ["Batch name", "Student email", "Date", "Start time", "Status"],
      ["Kids Hip-Hop", "ada@example.com", "2024-06-03", "16:00", "Present"],
    ],
  },
]);
fs.writeFileSync(studioPath, studioBuffer);
console.log(`wrote ${studioPath} (${studioBuffer.length} bytes)`);

const legacySessionPath = path.join(outDir, "session-import-template.xlsx");
if (fs.existsSync(legacySessionPath)) {
  fs.unlinkSync(legacySessionPath);
  console.log(`removed ${legacySessionPath}`);
}
