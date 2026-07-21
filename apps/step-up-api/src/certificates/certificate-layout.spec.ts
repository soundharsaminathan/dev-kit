import { describe, expect, it } from "vitest";
import {
  createDefaultCertificateDocument,
  formatCertificateNumber,
  normalizeCertificateLayout,
} from "./certificate-layout";

describe("normalizeCertificateLayout", () => {
  it("normalizes a v2 document", () => {
    const doc = createDefaultCertificateDocument();
    const normalized = normalizeCertificateLayout(doc) as {
      version: number;
      elements: unknown[];
    };
    expect(normalized.version).toBe(2);
    expect(normalized.elements.length).toBeGreaterThan(0);
  });

  it("migrates v1 layouts", () => {
    const normalized = normalizeCertificateLayout({
      style: "classic",
      title: "Title",
      subtitle: "Sub",
      achievement: "Ach",
      signOff: "Sign",
      showDanceCategories: true,
      showTrainers: true,
    }) as { version: number };
    expect(normalized.version).toBe(2);
  });
});

describe("formatCertificateNumber", () => {
  it("formats PREFIX-YEAR-SEQ", () => {
    expect(formatCertificateNumber(2026, 7, "studio1")).toBe(
      "STUDIO1-2026-00007",
    );
  });
});
