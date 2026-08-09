import { useToastContext } from "@dev-ui/components/toast";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image,
  ImagePlus,
  Italic,
  PenLine,
  Redo2,
  Type,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type ReactNode, useRef } from "react";
import { useApi } from "@/lib/api-context";
import type {
  ImageElement,
  SignatureElement,
  TextElement,
  TipTapDoc,
} from "../../schema";
import { DEFAULT_TEXT_STYLE } from "../../schema";
import type { CertificateVariableKey } from "../../variables";
import { useDesigner } from "../state/document-store";
import { newElementId } from "../state/history";
import { uploadCertificateAsset } from "../upload";
import styles from "./designer-toolbar.module.scss";
import {
  applyTextStylePatch,
  FONT_FAMILIES,
  FONT_SIZES,
  resolveTextStyle,
  type TextStylePatch,
} from "./text-style";
import { VariablePicker } from "./variable-picker";

function emptyTextDoc(text = "Double-click to edit"): TipTapDoc {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { textAlign: "center", lineHeight: 1.4 },
        content: [
          {
            type: "text",
            text,
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
                  fontSize: "18px",
                  color: DEFAULT_TEXT_STYLE.color,
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.iconBtn}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      data-active={active || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function RibbonGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.ribbonGroup}>
      <div className={styles.ribbonControls}>{children}</div>
      <span className={styles.ribbonLabel}>{label}</span>
    </div>
  );
}

export function DesignerToolbar() {
  const api = useApi();
  const { toast } = useToastContext("DesignerToolbar");
  const { state, dispatch, selected, updateSelected } = useDesigner();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadKind = useRef<"image" | "signature" | "background">("image");

  const page = state.document.page;
  const maxZ = Math.max(0, ...state.document.elements.map((e) => e.zIndex));
  const textSelected = selected?.type === "text" ? selected : null;
  const textStyle = textSelected ? resolveTextStyle(textSelected) : null;
  const textDisabled = !textSelected;

  function applyStyle(patch: TextStylePatch) {
    if (!textSelected) return;
    updateSelected({
      content: applyTextStylePatch(textSelected.content, patch),
    });
  }

  function addText() {
    const el: TextElement = {
      id: newElementId("text"),
      type: "text",
      x: page.width / 2 - 160,
      y: page.height / 2 - 24,
      width: 320,
      height: 48,
      rotation: 0,
      zIndex: maxZ + 1,
      content: emptyTextDoc(),
    };
    dispatch({ type: "ADD_ELEMENT", element: el });
  }

  async function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const src = await uploadCertificateAsset(api, file);
      if (uploadKind.current === "background") {
        dispatch({
          type: "SET_DOCUMENT",
          document: {
            ...state.document,
            page: {
              ...page,
              background: { ...page.background, imageUrl: src },
            },
          },
        });
      } else if (uploadKind.current === "signature") {
        const el: SignatureElement = {
          id: newElementId("sig"),
          type: "signature",
          x: page.width / 2 - 80,
          y: page.height - 120,
          width: 160,
          height: 64,
          rotation: 0,
          zIndex: maxZ + 1,
          src,
          label: "Signature",
        };
        dispatch({ type: "ADD_ELEMENT", element: el });
      } else {
        const el: ImageElement = {
          id: newElementId("img"),
          type: "image",
          x: 40,
          y: 40,
          width: 120,
          height: 120,
          rotation: 0,
          zIndex: maxZ + 1,
          src,
          objectFit: "contain",
        };
        dispatch({ type: "ADD_ELEMENT", element: el });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Could not upload asset.",
        variant: "error",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function insertVariable(key: CertificateVariableKey) {
    if (!textSelected) {
      toast({
        title: "Select a text element",
        description: "Click a text box, then insert a variable.",
        variant: "info",
      });
      return;
    }
    const content: TipTapDoc = {
      type: "doc",
      content: [
        ...(textSelected.content.content ?? []),
        {
          type: "paragraph",
          attrs: { textAlign: textStyle?.textAlign ?? "center" },
          content: [
            {
              type: "variable",
              attrs: { key },
              marks: [
                {
                  type: "textStyle",
                  attrs: {
                    fontFamily:
                      textStyle?.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily,
                    fontSize: `${textStyle?.fontSize ?? 16}px`,
                    color: textStyle?.color ?? DEFAULT_TEXT_STYLE.color,
                    fontWeight: String(textStyle?.fontWeight ?? 400),
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    dispatch({
      type: "UPDATE_ELEMENT",
      id: textSelected.id,
      patch: { content },
    });
    dispatch({ type: "START_EDIT_TEXT", id: textSelected.id });
  }

  return (
    <div className={styles.root} role="toolbar" aria-label="Certificate tools">
      <RibbonGroup label="Clipboard">
        <ToolButton
          label="Undo"
          disabled={state.past.length === 0}
          onClick={() => dispatch({ type: "UNDO" })}
        >
          <Undo2 size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={state.future.length === 0}
          onClick={() => dispatch({ type: "REDO" })}
        >
          <Redo2 size={16} strokeWidth={2} />
        </ToolButton>
      </RibbonGroup>

      <RibbonGroup label="Insert">
        <ToolButton label="Add text" onClick={addText}>
          <Type size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label="Add logo"
          onClick={() => {
            uploadKind.current = "image";
            fileRef.current?.click();
          }}
        >
          <Image size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label="Add signature"
          onClick={() => {
            uploadKind.current = "signature";
            fileRef.current?.click();
          }}
        >
          <PenLine size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label="Upload background image"
          onClick={() => {
            uploadKind.current = "background";
            fileRef.current?.click();
          }}
        >
          <ImagePlus size={16} strokeWidth={2} />
        </ToolButton>
        <VariablePicker onInsert={insertVariable} disabled={textDisabled} />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => void onFileChange(e.target.files)}
        />
      </RibbonGroup>

      <RibbonGroup label="Font">
        <select
          className={styles.fontSelect}
          aria-label="Font family"
          disabled={textDisabled}
          value={textStyle?.fontFamily ?? FONT_FAMILIES[0]}
          onChange={(e) => applyStyle({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font.split(",")[0]!.replace(/'/g, "")}
            </option>
          ))}
        </select>
        <select
          className={styles.sizeSelect}
          aria-label="Font size"
          disabled={textDisabled}
          value={textStyle?.fontSize ?? 16}
          onChange={(e) => applyStyle({ fontSize: Number(e.target.value) })}
        >
          {Array.from(new Set([...FONT_SIZES, textStyle?.fontSize ?? 16]))
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
        </select>
        <div className={styles.btnCluster}>
          <ToolButton
            label="Bold"
            disabled={textDisabled}
            active={textStyle?.bold}
            onClick={() => applyStyle({ bold: !textStyle?.bold })}
          >
            <Bold size={16} strokeWidth={2.25} />
          </ToolButton>
          <ToolButton
            label="Italic"
            disabled={textDisabled}
            active={textStyle?.italic}
            onClick={() => applyStyle({ italic: !textStyle?.italic })}
          >
            <Italic size={16} strokeWidth={2.25} />
          </ToolButton>
          <ToolButton
            label="Underline"
            disabled={textDisabled}
            active={textStyle?.underline}
            onClick={() => applyStyle({ underline: !textStyle?.underline })}
          >
            <Underline size={16} strokeWidth={2.25} />
          </ToolButton>
        </div>
        <label className={styles.colorWrap} title="Font color">
          <span className={styles.colorLetter} aria-hidden>
            A
          </span>
          <span
            className={styles.colorBar}
            style={{ background: textStyle?.color ?? "#1a1a1a" }}
          />
          <input
            type="color"
            className={styles.colorInput}
            aria-label="Font color"
            disabled={textDisabled}
            value={textStyle?.color ?? "#1a1a1a"}
            onChange={(e) => applyStyle({ color: e.target.value })}
          />
        </label>
      </RibbonGroup>

      <RibbonGroup label="Paragraph">
        <div className={styles.btnCluster}>
          <ToolButton
            label="Align left"
            disabled={textDisabled}
            active={textStyle?.textAlign === "left"}
            onClick={() => applyStyle({ textAlign: "left" })}
          >
            <AlignLeft size={16} strokeWidth={2} />
          </ToolButton>
          <ToolButton
            label="Align center"
            disabled={textDisabled}
            active={textStyle?.textAlign === "center"}
            onClick={() => applyStyle({ textAlign: "center" })}
          >
            <AlignCenter size={16} strokeWidth={2} />
          </ToolButton>
          <ToolButton
            label="Align right"
            disabled={textDisabled}
            active={textStyle?.textAlign === "right"}
            onClick={() => applyStyle({ textAlign: "right" })}
          >
            <AlignRight size={16} strokeWidth={2} />
          </ToolButton>
        </div>
        <select
          className={styles.sizeSelect}
          aria-label="Line spacing"
          disabled={textDisabled}
          value={String(textStyle?.lineHeight ?? 1.4)}
          onChange={(e) => applyStyle({ lineHeight: Number(e.target.value) })}
        >
          {[1, 1.15, 1.4, 1.6, 2].map((value) => (
            <option key={value} value={value}>
              {value.toFixed(2)}
            </option>
          ))}
        </select>
      </RibbonGroup>

      <RibbonGroup label="View">
        <ToolButton
          label="Zoom out"
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.1 })}
        >
          <ZoomOut size={16} strokeWidth={2} />
        </ToolButton>
        <span className={styles.zoomLabel}>
          {Math.round(state.zoom * 100)}%
        </span>
        <ToolButton
          label="Zoom in"
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.1 })}
        >
          <ZoomIn size={16} strokeWidth={2} />
        </ToolButton>
      </RibbonGroup>
    </div>
  );
}
