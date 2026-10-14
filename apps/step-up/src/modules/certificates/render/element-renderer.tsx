import type { CSSProperties, ReactNode } from "react";
import type {
  CertificateCorner,
  CertificateDocument,
  CertificateElement,
  TextStyle,
} from "../schema";
import type { VariableBindings } from "../variables";
import { bindTipTapVariables, TipTapStatic } from "./bind-variables";
import styles from "./element-renderer.module.scss";

export function cornerStyle(corner: CertificateCorner): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    maxWidth: "40%",
    pointerEvents: "none",
  };
  switch (corner) {
    case "top-left":
      return { ...base, top: 12, left: 12, textAlign: "left" };
    case "top-right":
      return { ...base, top: 12, right: 12, textAlign: "right" };
    case "bottom-left":
      return { ...base, bottom: 12, left: 12, textAlign: "left" };
    case "bottom-right":
      return { ...base, bottom: 12, right: 12, textAlign: "right" };
  }
}

function textStyleCss(style: TextStyle): CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as CSSProperties["fontWeight"],
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
  };
}

type ElementRendererProps = {
  element: CertificateElement;
  bindings?: VariableBindings;
  interactive?: boolean;
};

export function ElementRenderer({
  element,
  bindings = {},
  interactive = false,
}: ElementRendererProps) {
  const box: CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: "center center",
    zIndex: element.zIndex,
    pointerEvents: interactive ? "auto" : "none",
  };

  if (element.type === "text") {
    const doc = bindTipTapVariables(element.content, bindings);
    return (
      <div style={box} className={styles.textEl} data-element-id={element.id}>
        <TipTapStatic doc={doc} className={styles.richText} />
      </div>
    );
  }

  if (element.type === "image") {
    return (
      <div style={box} className={styles.imageEl} data-element-id={element.id}>
        <img
          src={element.src}
          alt={element.alt ?? ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.objectFit ?? "contain",
            display: "block",
          }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      style={box}
      className={styles.signatureEl}
      data-element-id={element.id}
    >
      <img
        src={element.src}
        alt={element.label || "Signature"}
        style={{
          width: "100%",
          height: element.label ? "70%" : "100%",
          objectFit: "contain",
          display: "block",
        }}
        draggable={false}
      />
      {element.label ? (
        <p className={styles.signatureLabel}>{element.label}</p>
      ) : null}
    </div>
  );
}

type CertificatePageProps = {
  document: CertificateDocument;
  bindings?: VariableBindings;
  certificateNumberValue?: string;
  className?: string;
  style?: CSSProperties;
  showGrid?: boolean;
  children?: ReactNode;
};

export function CertificatePage({
  document: doc,
  bindings = {},
  certificateNumberValue,
  className,
  style,
  showGrid = false,
  children,
}: CertificatePageProps) {
  const sorted = [...doc.elements].sort((a, b) => a.zIndex - b.zIndex);
  const bg = doc.page.background;
  const numberValue =
    certificateNumberValue ?? bindings.certificate_id ?? "SU-2026-00042";

  return (
    <div
      className={[styles.page, className].filter(Boolean).join(" ")}
      style={{
        width: doc.page.width,
        height: doc.page.height,
        backgroundColor: bg.color,
        backgroundImage: bg.imageUrl ? `url(${bg.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      data-certificate-page
    >
      {showGrid ? (
        <div
          className={styles.gridOverlay}
          style={{
            backgroundSize: `${doc.grid.size}px ${doc.grid.size}px`,
          }}
          aria-hidden
        />
      ) : null}

      {sorted.map((el) => (
        <ElementRenderer key={el.id} element={el} bindings={bindings} />
      ))}

      {doc.certificateNumber.enabled ? (
        <div
          style={{
            ...cornerStyle(doc.certificateNumber.corner),
            ...textStyleCss(doc.certificateNumber.style),
            zIndex: 9999,
          }}
          className={styles.certNumber}
        >
          {numberValue}
        </div>
      ) : null}

      {children}
    </div>
  );
}
