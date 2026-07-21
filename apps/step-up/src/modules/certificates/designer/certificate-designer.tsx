import { useIsMobile } from "@dev-ui/hooks";
import { useEffect, useRef, useState } from "react";
import type { CertificateDocument } from "../schema";
import { CanvasStage } from "./canvas/canvas-stage";
import styles from "./certificate-designer.module.scss";
import { PropertyInspector } from "./inspector/property-inspector";
import {
  DesignerProvider,
  useDesigner,
  useDesignerAutosave,
  useDesignerShortcuts,
} from "./state/document-store";
import { DesignerToolbar } from "./toolbar/designer-toolbar";

type CertificateDesignerProps = {
  name: string;
  onNameChange: (name: string) => void;
  document: CertificateDocument;
  onDocumentChange: (document: CertificateDocument) => void;
  autosave?: (payload: {
    name: string;
    layoutJson: CertificateDocument;
  }) => Promise<void>;
  autosaveEnabled?: boolean;
  /** Slim chrome: inline title edit instead of labeled form field. */
  compactChrome?: boolean;
};

function InlineNameEdit({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className={styles.inlineNameButton}
        onClick={() => setEditing(true)}
        title="Rename template"
      >
        <span className={styles.inlineNameText}>
          {value.trim() || "Untitled template"}
        </span>
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      className={styles.inlineNameInput}
      value={value}
      aria-label="Template name"
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        }
      }}
    />
  );
}

function DesignerInner({
  onNameChange,
  onDocumentChange,
  autosave,
  autosaveEnabled,
  compactChrome,
}: {
  onNameChange: (name: string) => void;
  onDocumentChange: (document: CertificateDocument) => void;
  autosave?: CertificateDesignerProps["autosave"];
  autosaveEnabled?: boolean;
  compactChrome?: boolean;
}) {
  const isMobile = useIsMobile();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { state, dispatch } = useDesigner();

  useDesignerShortcuts();
  const autosaveOn = Boolean(autosaveEnabled && autosave);
  const { saving } = useDesignerAutosave(async (payload) => {
    onDocumentChange(payload.layoutJson);
    onNameChange(payload.name);
    if (autosave) await autosave(payload);
  }, autosaveOn);

  useEffect(() => {
    onDocumentChange(state.document);
  }, [state.document, onDocumentChange]);

  function setName(value: string) {
    dispatch({ type: "SET_NAME", name: value });
    onNameChange(value);
  }

  const saveLabel = autosaveOn;

  return (
    <div
      className={styles.root}
      data-mobile={isMobile || undefined}
      data-compact={compactChrome || undefined}
    >
      <div className={styles.nameRow}>
        {compactChrome ? (
          <InlineNameEdit value={state.name} onChange={setName} />
        ) : (
          <label className={styles.nameField}>
            <span className={styles.nameLabel}>Template name</span>
            <input
              className={styles.nameInput}
              value={state.name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        {saveLabel ? (
          <span
            className={styles.saveState}
            data-saving={saving || undefined}
            aria-live="polite"
          >
            {saving ? (
              <>
                Saving
                <span className={styles.savingDots} aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </>
            ) : (
              "Saved"
            )}
          </span>
        ) : null}
      </div>

      <DesignerToolbar />

      <div className={styles.workspace}>
        <CanvasStage />
        {isMobile ? (
          <>
            <button
              type="button"
              className={styles.inspectorToggle}
              onClick={() => setInspectorOpen((o) => !o)}
            >
              {inspectorOpen ? "Hide properties" : "Properties"}
            </button>
            {inspectorOpen ? (
              <div className={styles.inspectorSheet}>
                <PropertyInspector />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.inspectorPane}>
            <PropertyInspector />
          </div>
        )}
      </div>
    </div>
  );
}

export function CertificateDesigner({
  name,
  onNameChange,
  document,
  onDocumentChange,
  autosave,
  autosaveEnabled = false,
  compactChrome = false,
}: CertificateDesignerProps) {
  return (
    <DesignerProvider document={document} name={name}>
      <DesignerInner
        onNameChange={onNameChange}
        onDocumentChange={onDocumentChange}
        autosave={autosave}
        autosaveEnabled={autosaveEnabled}
        compactChrome={compactChrome}
      />
    </DesignerProvider>
  );
}

export function isCertificateDocumentValid(doc: CertificateDocument) {
  return (
    doc.version === 2 &&
    Array.isArray(doc.elements) &&
    doc.page.width > 0 &&
    doc.page.height > 0
  );
}
