import { describe, expect, it } from "vitest";
import { createDefaultCertificateDocument } from "../defaults";
import {
  isCertificateDocumentV2,
  isCertificateLayoutV1,
  migrateLayoutToV2,
} from "../migrate-layout";
import { bindTipTapVariables } from "../render/bind-variables";
import type { TipTapDoc } from "../schema";
import { formatCertificateNumber } from "../variables";

describe("migrateLayoutToV2", () => {
  it("passes through v2 documents", () => {
    const doc = createDefaultCertificateDocument();
    expect(migrateLayoutToV2(doc)).toEqual(doc);
    expect(isCertificateDocumentV2(doc)).toBe(true);
  });

  it("migrates classic v1 layouts into positioned text elements", () => {
    const v1 = {
      style: "classic",
      title: "Award",
      subtitle: "Presented to",
      achievement: "for completing",
      signOff: "Congrats",
      showDanceCategories: true,
      showTrainers: false,
    };
    expect(isCertificateLayoutV1(v1)).toBe(true);
    const doc = migrateLayoutToV2(v1);
    expect(doc.version).toBe(2);
    expect(doc.elements.some((e) => e.type === "text")).toBe(true);
    expect(doc.certificateNumber.enabled).toBe(true);
  });

  it("falls back to default for unknown shapes", () => {
    const doc = migrateLayoutToV2({ foo: 1 });
    expect(doc.version).toBe(2);
    expect(doc.elements.length).toBeGreaterThan(0);
  });
});

describe("bindTipTapVariables", () => {
  it("replaces variable nodes with bound values", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "variable", attrs: { key: "student_name" } }],
        },
      ],
    };
    const bound = bindTipTapVariables(doc, { student_name: "Alex" });
    expect(bound.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Alex",
    });
  });
});

describe("formatCertificateNumber", () => {
  it("pads sequence to five digits", () => {
    expect(formatCertificateNumber(2026, 42, "SU")).toBe("SU-2026-00042");
  });
});
