export type CertificateCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
};

export type PageBackground = {
  color: string;
  imageUrl?: string | null;
};

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
};

/** TipTap document JSON (ProseMirror-compatible). */
export type TipTapDoc = {
  type: "doc";
  content?: TipTapNode[];
};

export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type TextElement = ElementBase & {
  type: "text";
  content: TipTapDoc;
};

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  alt?: string;
  objectFit?: "contain" | "cover" | "fill";
};

export type SignatureElement = ElementBase & {
  type: "signature";
  src: string;
  label?: string;
};

export type CertificateElement = TextElement | ImageElement | SignatureElement;

export type CertificateDocument = {
  version: 2;
  page: {
    width: number;
    height: number;
    unit: "px";
    background: PageBackground;
  };
  grid: {
    size: number;
    snap: boolean;
  };
  certificateNumber: {
    enabled: boolean;
    corner: CertificateCorner;
    style: TextStyle;
  };
  elements: CertificateElement[];
};

/** Legacy flat layout stored before the designer. */
export type CertificateLayoutV1 = {
  style: string;
  title: string;
  subtitle: string;
  achievement: string;
  signOff: string;
  showDanceCategories: boolean;
  showTrainers: boolean;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  isSample: boolean;
  layoutJson: CertificateDocument | CertificateLayoutV1;
};

export const CERTIFICATE_PAGE = {
  width: 800,
  height: 566,
} as const;

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 16,
  fontWeight: 400,
  color: "#1a1a1a",
  textAlign: "center",
  lineHeight: 1.4,
};

export const MAX_CERTIFICATE_ELEMENTS = 40;
