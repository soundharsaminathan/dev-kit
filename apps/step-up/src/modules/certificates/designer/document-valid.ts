import type { CertificateDocument } from "../schema";

export function isCertificateDocumentValid(doc: CertificateDocument) {
  return (
    doc.version === 2 &&
    Array.isArray(doc.elements) &&
    doc.page.width > 0 &&
    doc.page.height > 0
  );
}
