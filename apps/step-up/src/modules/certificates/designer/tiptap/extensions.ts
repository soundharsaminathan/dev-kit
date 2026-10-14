import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import type { CertificateVariableKey } from "../../variables";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    variable: {
      insertVariable: (key: CertificateVariableKey) => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) return {};
              return { style: `font-weight: ${attributes.fontWeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

export const LineHeight = Extension.create({
  name: "paragraphLineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
});

export const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  marks: "_",

  addAttributes() {
    return {
      key: {
        default: "student_name",
        parseHTML: (element) =>
          element.getAttribute("data-key") || "student_name",
        renderHTML: (attributes) => ({
          "data-key": attributes.key,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="variable"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = node.attrs.key ?? "var";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "variable",
        "data-key": key,
        class: "cert-var",
      }),
      `{{${key}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (key: CertificateVariableKey) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { key },
          }),
    };
  },
});

export function createCertificateExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      code: false,
    }),
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    TextAlign.configure({ types: ["paragraph"] }),
    LineHeight,
    Variable,
  ];
}
