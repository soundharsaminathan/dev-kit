import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export const CERTIFICATE_PAGE = { width: 800, height: 566 } as const;
export const MAX_CERTIFICATE_ELEMENTS = 40;

const CORNERS = new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

const ELEMENT_TYPES = new Set(["text", "image", "signature"]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function plainDoc(text: string, fontSize: number, fontWeight = 400) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { textAlign: "center", lineHeight: 1.4 },
        content: text
          ? [
              {
                type: "text",
                text,
                marks: [
                  {
                    type: "textStyle",
                    attrs: {
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: `${fontSize}px`,
                      color: "#1a1a1a",
                      fontWeight: String(fontWeight),
                    },
                  },
                ],
              },
            ]
          : undefined,
      },
    ],
  };
}

function variableDoc(key: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { textAlign: "center", lineHeight: 1.4 },
        content: [{ type: "variable", attrs: { key } }],
      },
    ],
  };
}

export function createDefaultCertificateDocument() {
  const pageW = CERTIFICATE_PAGE.width;
  const centerX = (w: number) => (pageW - w) / 2;

  return {
    version: 2 as const,
    page: {
      width: pageW,
      height: CERTIFICATE_PAGE.height,
      unit: "px" as const,
      background: { color: "#faf8f5", imageUrl: null as string | null },
    },
    grid: { size: 8, snap: true },
    certificateNumber: {
      enabled: true,
      corner: "bottom-right" as const,
      style: {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        fontWeight: 400,
        color: "#6b7280",
        textAlign: "right" as const,
        lineHeight: 1.4,
      },
    },
    elements: [
      {
        id: "el-title",
        type: "text" as const,
        x: centerX(640),
        y: 48,
        width: 640,
        height: 48,
        rotation: 0,
        zIndex: 1,
        content: plainDoc("Certificate of Completion", 32, 700),
      },
      {
        id: "el-subtitle",
        type: "text" as const,
        x: centerX(480),
        y: 110,
        width: 480,
        height: 32,
        rotation: 0,
        zIndex: 2,
        content: plainDoc("This is to certify that", 14),
      },
      {
        id: "el-student",
        type: "text" as const,
        x: centerX(560),
        y: 160,
        width: 560,
        height: 48,
        rotation: 0,
        zIndex: 3,
        content: variableDoc("student_name"),
      },
      {
        id: "el-achievement",
        type: "text" as const,
        x: centerX(520),
        y: 220,
        width: 520,
        height: 32,
        rotation: 0,
        zIndex: 4,
        content: plainDoc("has successfully completed", 14),
      },
      {
        id: "el-course",
        type: "text" as const,
        x: centerX(560),
        y: 260,
        width: 560,
        height: 36,
        rotation: 0,
        zIndex: 5,
        content: variableDoc("course_name"),
      },
      {
        id: "el-meta",
        type: "text" as const,
        x: centerX(560),
        y: 320,
        width: 560,
        height: 48,
        rotation: 0,
        zIndex: 6,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "center", lineHeight: 1.5 },
              content: [
                { type: "text", text: "Dance styles: " },
                { type: "variable", attrs: { key: "dance_categories" } },
              ],
            },
            {
              type: "paragraph",
              attrs: { textAlign: "center", lineHeight: 1.5 },
              content: [
                { type: "text", text: "Trainers: " },
                { type: "variable", attrs: { key: "trainers" } },
              ],
            },
          ],
        },
      },
      {
        id: "el-signoff",
        type: "text" as const,
        x: centerX(520),
        y: 420,
        width: 520,
        height: 40,
        rotation: 0,
        zIndex: 7,
        content: plainDoc(
          "Awarded in recognition of dedication and progress",
          13,
        ),
      },
      {
        id: "el-date",
        type: "text" as const,
        x: centerX(280),
        y: 480,
        width: 280,
        height: 28,
        rotation: 0,
        zIndex: 8,
        content: variableDoc("completion_date"),
      },
    ],
  };
}

export const SAMPLE_CERTIFICATE_LAYOUT = createDefaultCertificateDocument();

function migrateV1(layout: JsonRecord) {
  const pageW = CERTIFICATE_PAGE.width;
  const centerX = (w: number) => (pageW - w) / 2;
  const title = asString(layout.title).trim();
  const subtitle = asString(layout.subtitle).trim();
  const achievement = asString(layout.achievement).trim();
  const signOff = asString(layout.signOff).trim();
  const showDanceCategories = asBool(layout.showDanceCategories, true);
  const showTrainers = asBool(layout.showTrainers, true);

  const elements: JsonRecord[] = [
    {
      id: "migrated-title",
      type: "text",
      x: centerX(640),
      y: 48,
      width: 640,
      height: 48,
      rotation: 0,
      zIndex: 1,
      content: plainDoc(title || "Certificate of Completion", 32, 700),
    },
    {
      id: "migrated-subtitle",
      type: "text",
      x: centerX(480),
      y: 110,
      width: 480,
      height: 32,
      rotation: 0,
      zIndex: 2,
      content: plainDoc(subtitle || "This is to certify that", 14),
    },
    {
      id: "migrated-student",
      type: "text",
      x: centerX(560),
      y: 160,
      width: 560,
      height: 48,
      rotation: 0,
      zIndex: 3,
      content: variableDoc("student_name"),
    },
    {
      id: "migrated-achievement",
      type: "text",
      x: centerX(520),
      y: 220,
      width: 520,
      height: 32,
      rotation: 0,
      zIndex: 4,
      content: plainDoc(achievement || "has successfully completed", 14),
    },
    {
      id: "migrated-course",
      type: "text",
      x: centerX(560),
      y: 260,
      width: 560,
      height: 36,
      rotation: 0,
      zIndex: 5,
      content: variableDoc("course_name"),
    },
  ];

  if (showDanceCategories) {
    elements.push({
      id: "migrated-categories",
      type: "text",
      x: centerX(560),
      y: 310,
      width: 560,
      height: 28,
      rotation: 0,
      zIndex: 6,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [
              { type: "text", text: "Dance styles: " },
              { type: "variable", attrs: { key: "dance_categories" } },
            ],
          },
        ],
      },
    });
  }

  if (showTrainers) {
    elements.push({
      id: "migrated-trainers",
      type: "text",
      x: centerX(560),
      y: showDanceCategories ? 340 : 310,
      width: 560,
      height: 28,
      rotation: 0,
      zIndex: 7,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [
              { type: "text", text: "Trainers: " },
              { type: "variable", attrs: { key: "trainers" } },
            ],
          },
        ],
      },
    });
  }

  elements.push({
    id: "migrated-signoff",
    type: "text",
    x: centerX(520),
    y: 420,
    width: 520,
    height: 40,
    rotation: 0,
    zIndex: 8,
    content: plainDoc(
      signOff || "Awarded in recognition of dedication and progress",
      13,
    ),
  });

  const base = createDefaultCertificateDocument();
  return { ...base, elements };
}

function normalizeElement(raw: unknown, index: number): JsonRecord {
  if (!isRecord(raw)) {
    throw new BadRequestException(
      `Invalid certificate element at index ${index}`,
    );
  }
  const type = asString(raw.type);
  if (!ELEMENT_TYPES.has(type)) {
    throw new BadRequestException(
      `Unsupported certificate element type "${type}"`,
    );
  }
  const id = asString(raw.id) || `el-${index}`;
  const base = {
    id,
    type,
    x: asNumber(raw.x, 0),
    y: asNumber(raw.y, 0),
    width: Math.max(8, asNumber(raw.width, 100)),
    height: Math.max(8, asNumber(raw.height, 40)),
    rotation: asNumber(raw.rotation, 0),
    zIndex: asNumber(raw.zIndex, index + 1),
    locked: asBool(raw.locked, false),
  };

  if (type === "text") {
    if (!isRecord(raw.content) || raw.content.type !== "doc") {
      throw new BadRequestException(
        `Text element "${id}" needs TipTap content`,
      );
    }
    return { ...base, content: raw.content };
  }

  const src = asString(raw.src).trim();
  if (!src) {
    throw new BadRequestException(`${type} element "${id}" requires src`);
  }
  if (type === "image") {
    return {
      ...base,
      src,
      alt: asString(raw.alt, ""),
      objectFit: ["contain", "cover", "fill"].includes(asString(raw.objectFit))
        ? raw.objectFit
        : "contain",
    };
  }
  return {
    ...base,
    src,
    label: asString(raw.label, ""),
  };
}

function normalizeV2(layout: JsonRecord): Prisma.InputJsonValue {
  const pageRaw = isRecord(layout.page) ? layout.page : {};
  const bgRaw = isRecord(pageRaw.background) ? pageRaw.background : {};
  const gridRaw = isRecord(layout.grid) ? layout.grid : {};
  const certNoRaw = isRecord(layout.certificateNumber)
    ? layout.certificateNumber
    : {};
  const styleRaw = isRecord(certNoRaw.style) ? certNoRaw.style : {};

  const elementsRaw = Array.isArray(layout.elements) ? layout.elements : [];
  if (elementsRaw.length > MAX_CERTIFICATE_ELEMENTS) {
    throw new BadRequestException(
      `Certificate templates support at most ${MAX_CERTIFICATE_ELEMENTS} elements`,
    );
  }

  const corner = asString(certNoRaw.corner, "bottom-right");
  if (!CORNERS.has(corner)) {
    throw new BadRequestException("Invalid certificate number corner");
  }

  const width = Math.min(
    2000,
    Math.max(320, asNumber(pageRaw.width, CERTIFICATE_PAGE.width)),
  );
  const height = Math.min(
    2000,
    Math.max(240, asNumber(pageRaw.height, CERTIFICATE_PAGE.height)),
  );

  const textAlignRaw = asString(styleRaw.textAlign, "right");
  const textAlign =
    textAlignRaw === "left" ||
    textAlignRaw === "center" ||
    textAlignRaw === "right"
      ? textAlignRaw
      : "right";
  const fontWeight =
    typeof styleRaw.fontWeight === "number" ||
    typeof styleRaw.fontWeight === "string"
      ? styleRaw.fontWeight
      : 400;

  return {
    version: 2,
    page: {
      width,
      height,
      unit: "px",
      background: {
        color: asString(bgRaw.color, "#faf8f5") || "#faf8f5",
        imageUrl: bgRaw.imageUrl == null ? null : asString(bgRaw.imageUrl),
      },
    },
    grid: {
      size: Math.min(64, Math.max(4, asNumber(gridRaw.size, 8))),
      snap: asBool(gridRaw.snap, true),
    },
    certificateNumber: {
      enabled: asBool(certNoRaw.enabled, true),
      corner,
      style: {
        fontFamily: asString(
          styleRaw.fontFamily,
          "ui-monospace, SFMono-Regular, Menlo, monospace",
        ),
        fontSize: asNumber(styleRaw.fontSize, 11),
        fontWeight,
        color: asString(styleRaw.color, "#6b7280"),
        textAlign,
        lineHeight: asNumber(styleRaw.lineHeight, 1.4),
      },
    },
    elements: elementsRaw.map((el, i) => normalizeElement(el, i)),
  } as Prisma.InputJsonValue;
}

/** Accepts v1 or v2 layout JSON and returns a normalized v2 document. */
export function normalizeCertificateLayout(
  layoutJson: unknown,
): Prisma.InputJsonValue {
  if (!isRecord(layoutJson)) {
    throw new BadRequestException("Certificate layout must be an object");
  }

  if (layoutJson.version === 2) {
    return normalizeV2(layoutJson);
  }

  if (typeof layoutJson.title === "string") {
    return normalizeV2(migrateV1(layoutJson));
  }

  throw new BadRequestException("Unrecognized certificate layout format");
}

export function formatCertificateNumber(
  year: number,
  seq: number,
  studioKey = "SU",
): string {
  const prefix =
    studioKey
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "SU";
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
