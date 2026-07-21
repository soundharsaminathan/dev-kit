import type { TextElement, TipTapDoc, TipTapNode } from "../../schema";

export const FONT_FAMILIES = [
  "Georgia, 'Times New Roman', serif",
  "'Times New Roman', Times, serif",
  "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  "'Bookman Old Style', Georgia, serif",
  "Garamond, 'Times New Roman', serif",
  "'Lucida Bright', Georgia, serif",
  "Cambria, Georgia, serif",
  "Arial, Helvetica, sans-serif",
  "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "Verdana, Geneva, sans-serif",
  "Tahoma, Geneva, sans-serif",
  "'Trebuchet MS', 'Lucida Grande', sans-serif",
  "'Segoe UI', system-ui, sans-serif",
  "system-ui, -apple-system, sans-serif",
  "'Century Gothic', AppleGothic, sans-serif",
  "Calibri, Candara, sans-serif",
  "'Comic Sans MS', 'Comic Sans', cursive",
  "'Brush Script MT', cursive",
  "'Courier New', Courier, monospace",
  "ui-monospace, SFMono-Regular, Menlo, monospace",
  "Consolas, 'Courier New', monospace",
] as const;

export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];

export type ResolvedTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: string;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const DEFAULT_RESOLVED: ResolvedTextStyle = {
  fontFamily: FONT_FAMILIES[0],
  fontSize: 16,
  fontWeight: 400,
  color: "#1a1a1a",
  textAlign: "center",
  lineHeight: 1.4,
  bold: false,
  italic: false,
  underline: false,
};

function hasMark(node: TipTapNode, type: string) {
  return Boolean(node.marks?.some((m) => m.type === type));
}

function toggleMark(node: TipTapNode, type: string, on: boolean) {
  const marks = [...(node.marks ?? [])].filter((m) => m.type !== type);
  if (on) marks.push({ type });
  if (marks.length > 0) {
    node.marks = marks;
  } else {
    delete node.marks;
  }
}

function patchTextStyle(
  node: TipTapNode,
  patch: Record<string, string | number>,
) {
  const marks = [...(node.marks ?? [])];
  const idx = marks.findIndex((m) => m.type === "textStyle");
  if (idx >= 0) {
    marks[idx] = {
      type: "textStyle",
      attrs: { ...marks[idx]!.attrs, ...patch },
    };
  } else {
    marks.push({ type: "textStyle", attrs: { ...patch } });
  }
  node.marks = marks;
}

export function resolveTextStyle(element: TextElement): ResolvedTextStyle {
  for (const block of element.content.content ?? []) {
    const align = String(block.attrs?.textAlign ?? "center");
    const lineHeight = Number(block.attrs?.lineHeight ?? 1.4);
    for (const node of block.content ?? []) {
      if (node.type !== "text" && node.type !== "variable") continue;
      const style =
        node.marks?.find((m) => m.type === "textStyle")?.attrs ?? {};
      const sizeRaw = style.fontSize;
      const fontSize =
        typeof sizeRaw === "number"
          ? sizeRaw
          : Number.parseInt(String(sizeRaw ?? "16"), 10) || 16;
      const bold =
        hasMark(node, "bold") || Number(style.fontWeight ?? 400) >= 600;
      return {
        fontFamily: String(style.fontFamily ?? FONT_FAMILIES[0]),
        fontSize,
        fontWeight: Number(style.fontWeight ?? (bold ? 700 : 400)) || 400,
        color: String(style.color ?? "#1a1a1a"),
        textAlign: align,
        lineHeight,
        bold,
        italic: hasMark(node, "italic"),
        underline: hasMark(node, "underline"),
      };
    }
  }
  return { ...DEFAULT_RESOLVED };
}

export type TextStylePatch = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: string;
  lineHeight?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export function applyTextStylePatch(
  content: TipTapDoc,
  patch: TextStylePatch,
): TipTapDoc {
  const next = structuredClone(content);
  for (const block of next.content ?? []) {
    if (patch.textAlign !== undefined) {
      block.attrs = { ...block.attrs, textAlign: patch.textAlign };
    }
    if (patch.lineHeight !== undefined) {
      block.attrs = { ...block.attrs, lineHeight: patch.lineHeight };
    }
    for (const node of block.content ?? []) {
      if (node.type !== "text" && node.type !== "variable") continue;
      const stylePatch: Record<string, string | number> = {};
      if (patch.fontFamily !== undefined)
        stylePatch.fontFamily = patch.fontFamily;
      if (patch.fontSize !== undefined) {
        stylePatch.fontSize = `${patch.fontSize}px`;
      }
      if (patch.fontWeight !== undefined)
        stylePatch.fontWeight = patch.fontWeight;
      if (patch.color !== undefined) stylePatch.color = patch.color;
      if (patch.bold === true) stylePatch.fontWeight = 700;
      if (patch.bold === false && patch.fontWeight === undefined) {
        stylePatch.fontWeight = 400;
      }
      if (Object.keys(stylePatch).length > 0) {
        patchTextStyle(node, stylePatch);
      }
      if (patch.bold !== undefined) toggleMark(node, "bold", patch.bold);
      if (patch.italic !== undefined) toggleMark(node, "italic", patch.italic);
      if (patch.underline !== undefined) {
        toggleMark(node, "underline", patch.underline);
      }
    }
  }
  return next;
}
