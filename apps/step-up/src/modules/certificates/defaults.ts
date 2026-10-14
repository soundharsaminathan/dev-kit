import type {
  CertificateDocument,
  TextElement,
  TipTapDoc,
  TipTapNode,
} from "./schema";
import { CERTIFICATE_PAGE, DEFAULT_TEXT_STYLE } from "./schema";
import type { variableToken } from "./variables";

function plainParagraph(
  text: string,
  style: Partial<typeof DEFAULT_TEXT_STYLE> = {},
): TipTapDoc {
  const merged = { ...DEFAULT_TEXT_STYLE, ...style };
  const paragraph: TipTapNode = {
    type: "paragraph",
    attrs: {
      textAlign: merged.textAlign,
      lineHeight: merged.lineHeight,
    },
  };
  if (text) {
    paragraph.content = [
      {
        type: "text",
        text,
        marks: [
          {
            type: "textStyle",
            attrs: {
              fontFamily: merged.fontFamily,
              fontSize: `${merged.fontSize}px`,
              color: merged.color,
              fontWeight: String(merged.fontWeight),
            },
          },
        ],
      },
    ];
  }
  return {
    type: "doc",
    content: [paragraph],
  };
}

function variableParagraph(
  key: Parameters<typeof variableToken>[0],
  style: Partial<typeof DEFAULT_TEXT_STYLE> = {},
): TipTapDoc {
  const merged = { ...DEFAULT_TEXT_STYLE, ...style };
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: {
          textAlign: merged.textAlign,
          lineHeight: merged.lineHeight,
        },
        content: [
          {
            type: "variable",
            attrs: { key },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: merged.fontFamily,
                  fontSize: `${merged.fontSize}px`,
                  color: merged.color,
                  fontWeight: String(merged.fontWeight),
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function textEl(
  partial: Omit<TextElement, "type" | "rotation" | "locked"> & {
    content: TipTapDoc;
  },
): TextElement {
  return {
    type: "text",
    rotation: 0,
    ...partial,
  };
}

export function createDefaultCertificateDocument(): CertificateDocument {
  const pageW = CERTIFICATE_PAGE.width;
  const pageH = CERTIFICATE_PAGE.height;
  const centerX = (w: number) => (pageW - w) / 2;

  return {
    version: 2,
    page: {
      width: pageW,
      height: pageH,
      unit: "px",
      background: { color: "#faf8f5", imageUrl: null },
    },
    grid: { size: 8, snap: true },
    certificateNumber: {
      enabled: true,
      corner: "bottom-right",
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        color: "#6b7280",
        textAlign: "right",
      },
    },
    elements: [
      textEl({
        id: "el-title",
        x: centerX(640),
        y: 48,
        width: 640,
        height: 48,
        zIndex: 1,
        content: plainParagraph("Certificate of Completion", {
          fontSize: 32,
          fontWeight: 700,
        }),
      }),
      textEl({
        id: "el-subtitle",
        x: centerX(480),
        y: 110,
        width: 480,
        height: 32,
        zIndex: 2,
        content: plainParagraph("This is to certify that", {
          fontSize: 14,
          color: "#4b5563",
        }),
      }),
      textEl({
        id: "el-student",
        x: centerX(560),
        y: 160,
        width: 560,
        height: 48,
        zIndex: 3,
        content: variableParagraph("student_name", {
          fontSize: 28,
          fontWeight: 600,
        }),
      }),
      textEl({
        id: "el-achievement",
        x: centerX(520),
        y: 220,
        width: 520,
        height: 32,
        zIndex: 4,
        content: plainParagraph("has successfully completed", {
          fontSize: 14,
          color: "#4b5563",
        }),
      }),
      textEl({
        id: "el-course",
        x: centerX(560),
        y: 260,
        width: 560,
        height: 36,
        zIndex: 5,
        content: variableParagraph("course_name", {
          fontSize: 18,
          fontWeight: 600,
        }),
      }),
      textEl({
        id: "el-meta",
        x: centerX(560),
        y: 320,
        width: 560,
        height: 48,
        zIndex: 6,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "center", lineHeight: 1.5 },
              content: [
                {
                  type: "text",
                  text: "Dance styles: ",
                  marks: [
                    {
                      type: "textStyle",
                      attrs: {
                        fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
                        fontSize: "13px",
                        color: "#6b7280",
                      },
                    },
                  ],
                },
                { type: "variable", attrs: { key: "dance_categories" } },
              ],
            },
            {
              type: "paragraph",
              attrs: { textAlign: "center", lineHeight: 1.5 },
              content: [
                {
                  type: "text",
                  text: "Trainers: ",
                  marks: [
                    {
                      type: "textStyle",
                      attrs: {
                        fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
                        fontSize: "13px",
                        color: "#6b7280",
                      },
                    },
                  ],
                },
                { type: "variable", attrs: { key: "trainers" } },
              ],
            },
          ],
        },
      }),
      textEl({
        id: "el-signoff",
        x: centerX(520),
        y: 420,
        width: 520,
        height: 40,
        zIndex: 7,
        content: plainParagraph(
          "Awarded in recognition of dedication and progress",
          { fontSize: 13, color: "#4b5563" },
        ),
      }),
      textEl({
        id: "el-date",
        x: centerX(280),
        y: 480,
        width: 280,
        height: 28,
        zIndex: 8,
        content: variableParagraph("completion_date", {
          fontSize: 12,
          color: "#6b7280",
        }),
      }),
    ],
  };
}

/** @deprecated Use createDefaultCertificateDocument */
export const DEFAULT_CERTIFICATE_LAYOUT = createDefaultCertificateDocument();

export const CERTIFICATE_STYLES = [
  { id: "classic", label: "Classic" },
] as const;
