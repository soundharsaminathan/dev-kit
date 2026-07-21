import type { CSSProperties, ReactNode } from "react";
import type { TipTapDoc, TipTapNode } from "../schema";
import type { CertificateVariableKey, VariableBindings } from "../variables";
import { parseVariableToken } from "../variables";

function bindNode(node: TipTapNode, bindings: VariableBindings): TipTapNode {
  if (node.type === "variable") {
    const key = String(node.attrs?.key ?? "") as CertificateVariableKey;
    const value = bindings[key] ?? `{{${key}}}`;
    const next: TipTapNode = {
      type: "text",
      text: value,
    };
    if (node.marks) next.marks = node.marks;
    return next;
  }

  if (node.type === "text" && node.text) {
    const asVar = parseVariableToken(node.text);
    if (asVar && bindings[asVar] !== undefined) {
      return { ...node, text: bindings[asVar] };
    }
  }

  if (node.content) {
    return {
      ...node,
      content: node.content.map((child) => bindNode(child, bindings)),
    };
  }

  return node;
}

export function bindTipTapVariables(
  doc: TipTapDoc,
  bindings: VariableBindings,
): TipTapDoc {
  const next: TipTapDoc = { type: "doc" };
  if (doc.content) {
    next.content = doc.content.map((node) => bindNode(node, bindings));
  }
  return next;
}

function marksToStyle(marks?: TipTapNode["marks"]): CSSProperties {
  const style: CSSProperties = {};
  for (const mark of marks ?? []) {
    if (mark.type === "bold") style.fontWeight = 700;
    if (mark.type === "italic") style.fontStyle = "italic";
    if (mark.type === "underline") style.textDecoration = "underline";
    if (mark.type === "textStyle" && mark.attrs) {
      if (typeof mark.attrs.fontFamily === "string") {
        style.fontFamily = mark.attrs.fontFamily;
      }
      if (typeof mark.attrs.fontSize === "string") {
        style.fontSize = mark.attrs.fontSize;
      } else if (typeof mark.attrs.fontSize === "number") {
        style.fontSize = `${mark.attrs.fontSize}px`;
      }
      if (typeof mark.attrs.color === "string") {
        style.color = mark.attrs.color;
      }
      if (
        typeof mark.attrs.fontWeight === "string" ||
        typeof mark.attrs.fontWeight === "number"
      ) {
        style.fontWeight = mark.attrs.fontWeight as CSSProperties["fontWeight"];
      }
    }
  }
  return style;
}

function renderInline(node: TipTapNode, key: string): ReactNode {
  if (node.type === "variable") {
    const label = String(node.attrs?.key ?? "var");
    return (
      <span
        key={key}
        data-variable={label}
        className="cert-var"
        style={marksToStyle(node.marks)}
      >
        {`{{${label}}}`}
      </span>
    );
  }

  if (node.type === "text") {
    return (
      <span key={key} style={marksToStyle(node.marks)}>
        {node.text}
      </span>
    );
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  return null;
}

function renderBlock(node: TipTapNode, key: string): ReactNode {
  if (node.type === "paragraph") {
    const align = (node.attrs?.textAlign as string) || "left";
    const lineHeight = node.attrs?.lineHeight;
    return (
      <p
        key={key}
        style={{
          margin: 0,
          textAlign: align as CSSProperties["textAlign"],
          lineHeight:
            typeof lineHeight === "number" || typeof lineHeight === "string"
              ? lineHeight
              : undefined,
        }}
      >
        {node.content?.map((child, i) => renderInline(child, `${key}-${i}`)) ??
          "\u00A0"}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2)));
    const style: CSSProperties = { margin: 0, textAlign: "center" };
    if (level === 1)
      return (
        <h1 key={key} style={style}>
          {node.content?.map((c, i) => renderInline(c, `${key}-${i}`))}
        </h1>
      );
    if (level === 3)
      return (
        <h3 key={key} style={style}>
          {node.content?.map((c, i) => renderInline(c, `${key}-${i}`))}
        </h3>
      );
    return (
      <h2 key={key} style={style}>
        {node.content?.map((c, i) => renderInline(c, `${key}-${i}`))}
      </h2>
    );
  }

  return null;
}

/** Read-only TipTap JSON → React (no editor). */
export function TipTapStatic({
  doc,
  className,
}: {
  doc: TipTapDoc;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      {doc.content?.map((node, i) => renderBlock(node, `b-${i}`))}
    </div>
  );
}
