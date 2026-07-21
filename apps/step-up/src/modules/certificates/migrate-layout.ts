import { createDefaultCertificateDocument } from "./defaults";
import type {
  CertificateDocument,
  CertificateElement,
  CertificateLayoutV1,
  TipTapDoc,
  TipTapNode,
} from "./schema";
import { CERTIFICATE_PAGE, DEFAULT_TEXT_STYLE } from "./schema";
import { variableToken } from "./variables";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCertificateDocumentV2(
  value: unknown,
): value is CertificateDocument {
  return (
    isRecord(value) && value.version === 2 && Array.isArray(value.elements)
  );
}

export function isCertificateLayoutV1(
  value: unknown,
): value is CertificateLayoutV1 {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.achievement === "string" &&
    typeof value.signOff === "string" &&
    value.version !== 2
  );
}

function plainDoc(text: string, fontSize: number, fontWeight = 400): TipTapDoc {
  const paragraph: TipTapNode = {
    type: "paragraph",
    attrs: { textAlign: "center", lineHeight: 1.4 },
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
              fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
              fontSize: `${fontSize}px`,
              color: DEFAULT_TEXT_STYLE.color,
              fontWeight: String(fontWeight),
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

function variableDoc(key: "student_name" | "course_name"): TipTapDoc {
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

export function migrateLayoutToV2(layout: unknown): CertificateDocument {
  if (isCertificateDocumentV2(layout)) {
    return layout;
  }

  if (!isCertificateLayoutV1(layout)) {
    return createDefaultCertificateDocument();
  }

  const pageW = CERTIFICATE_PAGE.width;
  const centerX = (w: number) => (pageW - w) / 2;
  const elements: CertificateElement[] = [
    {
      id: "migrated-title",
      type: "text",
      x: centerX(640),
      y: 48,
      width: 640,
      height: 48,
      rotation: 0,
      zIndex: 1,
      content: plainDoc(layout.title, 32, 700),
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
      content: plainDoc(layout.subtitle, 14),
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
      content: plainDoc(layout.achievement, 14),
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

  if (layout.showDanceCategories) {
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

  if (layout.showTrainers) {
    elements.push({
      id: "migrated-trainers",
      type: "text",
      x: centerX(560),
      y: layout.showDanceCategories ? 340 : 310,
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
    content: plainDoc(layout.signOff, 13),
  });

  const base = createDefaultCertificateDocument();
  return {
    ...base,
    elements,
  };
}

export function ensureCertificateDocument(
  layout: unknown,
): CertificateDocument {
  return migrateLayoutToV2(layout);
}

/** Lightweight summary line for template lists. */
export function certificateDocumentSummary(doc: CertificateDocument): string {
  const textCount = doc.elements.filter((e) => e.type === "text").length;
  const imageCount = doc.elements.filter(
    (e) => e.type === "image" || e.type === "signature",
  ).length;
  const parts = [`${textCount} text`, `${imageCount} images`];
  if (doc.certificateNumber.enabled) {
    parts.push("cert. no.");
  }
  return parts.join(" · ");
}

export function describeLegacyOrDocument(layout: unknown): string {
  if (isCertificateDocumentV2(layout)) {
    return certificateDocumentSummary(layout);
  }
  if (isCertificateLayoutV1(layout)) {
    const bits = [layout.title];
    if (layout.showDanceCategories) bits.push("Dance categories");
    if (layout.showTrainers) bits.push("Trainers");
    return bits.join(" · ");
  }
  return "Certificate template";
}

// Keep token helper available for tests / tooling
void variableToken;
