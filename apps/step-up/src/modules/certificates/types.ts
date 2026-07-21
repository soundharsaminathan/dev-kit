export {
  CERTIFICATE_STYLES,
  createDefaultCertificateDocument,
  DEFAULT_CERTIFICATE_LAYOUT,
} from "./defaults";
export {
  certificateDocumentSummary,
  describeLegacyOrDocument,
  ensureCertificateDocument,
  isCertificateDocumentV2,
  isCertificateLayoutV1,
  migrateLayoutToV2,
} from "./migrate-layout";
export type {
  CertificateCorner,
  CertificateDocument,
  CertificateElement,
  CertificateLayoutV1,
  CertificateTemplate,
  ImageElement,
  PageBackground,
  SignatureElement,
  TextElement,
  TextStyle,
  TipTapDoc,
} from "./schema";
export {
  CERTIFICATE_PAGE,
  DEFAULT_TEXT_STYLE,
  MAX_CERTIFICATE_ELEMENTS,
} from "./schema";

export {
  CERTIFICATE_VARIABLES,
  type CertificateVariableKey,
  formatCertificateNumber,
  parseVariableToken,
  sampleVariableBindings,
  type VariableBindings,
  variableToken,
} from "./variables";

/** @deprecated Prefer CertificateDocument */
export type CertificateLayout = import("./schema").CertificateDocument;
