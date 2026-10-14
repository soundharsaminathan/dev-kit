import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { FormInput } from "@/modules/ui/form-input";
import type { CertificateCorner, TextElement } from "../../schema";
import { useDesigner } from "../state/document-store";
import {
  applyTextStylePatch,
  FONT_FAMILIES,
  resolveTextStyle,
} from "../toolbar/text-style";
import { uploadCertificateAsset } from "../upload";
import styles from "./property-inspector.module.scss";

const CORNERS: { id: CertificateCorner; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function ElementImageField({
  src,
  onUploaded,
  onClear,
}: {
  src: string;
  onUploaded: (src: string) => void;
  onClear: () => void;
}) {
  const api = useApi();
  const { toast } = useToastContext("ElementImageField");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onUploaded(await uploadCertificateAsset(api, file));
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Could not upload image.",
        variant: "error",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Image</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => void onFile(e.target.files)}
      />
      <button
        type="button"
        className={styles.btn}
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "Uploading…" : src ? "Replace image" : "Upload image"}
      </button>
      {src ? (
        <>
          <div
            className={styles.bgPreview}
            style={{ backgroundImage: `url(${src})` }}
            aria-hidden
          />
          <button type="button" className={styles.linkBtn} onClick={onClear}>
            Remove image
          </button>
        </>
      ) : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      className={styles.input}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function PropertyInspector() {
  const api = useApi();
  const { toast } = useToastContext("PropertyInspector");
  const {
    state,
    selected,
    dispatch,
    updateSelected,
    setPage,
    setGrid,
    setCertificateNumber,
  } = useDesigner();
  const doc = state.document;
  const certNo = doc.certificateNumber;
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  async function onBackgroundFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const src = await uploadCertificateAsset(api, file);
      setPage({
        background: {
          ...doc.page.background,
          imageUrl: src,
        },
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not upload background.",
        variant: "error",
      });
    } finally {
      setUploadingBg(false);
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  }

  return (
    <aside className={styles.root}>
      <h2 className={styles.title}>Properties</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Page</h3>
        <Field label="Background color">
          <input
            type="color"
            className={styles.color}
            value={doc.page.background.color}
            onChange={(e) =>
              setPage({
                background: {
                  ...doc.page.background,
                  color: e.target.value,
                },
              })
            }
          />
        </Field>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Background image</span>
          <input
            ref={bgFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => void onBackgroundFile(e.target.files)}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={uploadingBg}
            onClick={() => bgFileRef.current?.click()}
          >
            {uploadingBg
              ? "Uploading…"
              : doc.page.background.imageUrl
                ? "Replace image"
                : "Upload image"}
          </button>
          {doc.page.background.imageUrl ? (
            <>
              <div
                className={styles.bgPreview}
                style={{
                  backgroundImage: `url(${doc.page.background.imageUrl})`,
                }}
                aria-hidden
              />
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() =>
                  setPage({
                    background: { ...doc.page.background, imageUrl: null },
                  })
                }
              >
                Remove background image
              </button>
            </>
          ) : null}
        </div>
        <Checkbox
          isSelected={doc.grid.snap}
          onChange={(selected) => setGrid({ snap: selected })}
        >
          Snap to grid
        </Checkbox>
        <Field label="Grid size">
          <NumberInput
            value={doc.grid.size}
            min={4}
            max={64}
            onChange={(size) => setGrid({ size })}
          />
        </Field>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Certificate number</h3>
        <Checkbox
          isSelected={certNo.enabled}
          onChange={(enabled) => setCertificateNumber({ enabled })}
        >
          Show in corner
        </Checkbox>
        <Select
          label="Corner"
          selectedKey={certNo.corner}
          onSelectionChange={(key) =>
            setCertificateNumber({ corner: String(key) as CertificateCorner })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CORNERS.map((c) => (
              <SelectItem key={c.id} id={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Field label="Color">
          <input
            type="color"
            className={styles.color}
            value={certNo.style.color}
            onChange={(e) =>
              setCertificateNumber({
                style: { ...certNo.style, color: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Size">
          <NumberInput
            value={certNo.style.fontSize}
            min={8}
            max={24}
            onChange={(fontSize) =>
              setCertificateNumber({
                style: { ...certNo.style, fontSize },
              })
            }
          />
        </Field>
      </section>

      {selected ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Element · {selected.type}</h3>
          <div className={styles.row2}>
            <Field label="X">
              <NumberInput
                value={Math.round(selected.x)}
                onChange={(x) => updateSelected({ x })}
              />
            </Field>
            <Field label="Y">
              <NumberInput
                value={Math.round(selected.y)}
                onChange={(y) => updateSelected({ y })}
              />
            </Field>
          </div>
          <div className={styles.row2}>
            <Field label="W">
              <NumberInput
                value={Math.round(selected.width)}
                min={16}
                onChange={(width) => updateSelected({ width })}
              />
            </Field>
            <Field label="H">
              <NumberInput
                value={Math.round(selected.height)}
                min={16}
                onChange={(height) => updateSelected({ height })}
              />
            </Field>
          </div>
          <Field label="Rotation">
            <NumberInput
              value={Math.round(selected.rotation)}
              onChange={(rotation) => updateSelected({ rotation })}
            />
          </Field>
          <div className={styles.row2}>
            <button
              type="button"
              className={styles.btn}
              onClick={() =>
                dispatch({ type: "BRING_FORWARD", id: selected.id })
              }
            >
              Forward
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() =>
                dispatch({ type: "SEND_BACKWARD", id: selected.id })
              }
            >
              Backward
            </button>
          </div>
          <Checkbox
            isSelected={Boolean(selected.locked)}
            onChange={(locked) => updateSelected({ locked })}
          >
            Lock
          </Checkbox>

          {selected.type === "text" ? (
            <TextStyleControls element={selected} />
          ) : null}

          {selected.type === "signature" ? (
            <FormInput
              label="Label"
              value={selected.label ?? ""}
              onChange={(label) => updateSelected({ label })}
            />
          ) : null}

          {selected.type === "image" || selected.type === "signature" ? (
            <ElementImageField
              src={selected.src}
              onUploaded={(src) => updateSelected({ src })}
              onClear={() => updateSelected({ src: "" })}
            />
          ) : null}

          <button
            type="button"
            className={styles.danger}
            onClick={() =>
              dispatch({ type: "REMOVE_ELEMENT", id: selected.id })
            }
          >
            Delete element
          </button>
        </section>
      ) : (
        <p className={styles.hint}>Select an element to edit its properties.</p>
      )}
    </aside>
  );
}

function TextStyleControls({ element }: { element: TextElement }) {
  const { updateSelected } = useDesigner();
  const firstText = resolveTextStyle(element);

  function applyMark(patch: Parameters<typeof applyTextStylePatch>[1]) {
    updateSelected({
      content: applyTextStylePatch(element.content, patch),
    });
  }

  return (
    <>
      <Select
        label="Font"
        selectedKey={firstText.fontFamily}
        onSelectionChange={(key) =>
          applyMark({ fontFamily: String(key ?? FONT_FAMILIES[0]) })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font} id={font}>
              {font.split(",")[0]!.replace(/'/g, "")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Field label="Font size">
        <NumberInput
          value={firstText.fontSize}
          min={8}
          max={96}
          onChange={(fontSize) => applyMark({ fontSize })}
        />
      </Field>
      <Field label="Weight">
        <NumberInput
          value={firstText.fontWeight}
          min={300}
          max={800}
          step={100}
          onChange={(fontWeight) => applyMark({ fontWeight })}
        />
      </Field>
      <Field label="Color">
        <input
          type="color"
          className={styles.color}
          value={firstText.color}
          onChange={(e) => applyMark({ color: e.target.value })}
        />
      </Field>
      <Select
        label="Align"
        selectedKey={firstText.textAlign}
        onSelectionChange={(key) =>
          applyMark({ textAlign: String(key ?? "center") })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="left">Left</SelectItem>
          <SelectItem id="center">Center</SelectItem>
          <SelectItem id="right">Right</SelectItem>
        </SelectContent>
      </Select>
      <Field label="Line height">
        <NumberInput
          value={firstText.lineHeight}
          min={1}
          max={3}
          step={0.1}
          onChange={(lineHeight) => applyMark({ lineHeight })}
        />
      </Field>
    </>
  );
}
