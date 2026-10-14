import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-share-sheet.module.scss";
import {
  downloadShareCard,
  shareOrDownloadShareCard,
} from "./export-share-card";
import {
  DEFAULT_SHARE_CTA,
  DEFAULT_SHARE_HEADLINE,
  SHARE_HEADLINES,
} from "./headlines";
import {
  availableShareFields,
  buildBatchShareCardData,
  defaultFieldVisibility,
} from "./map-batch-share-data";
import { ShareCardPreview } from "./share-card-preview";
import type {
  BatchShareSource,
  ShareCardFieldKey,
  ShareCardFieldVisibility,
  ShareCardLayoutId,
  StudioShareSource,
} from "./types";
import { SHARE_CARD_FIELD_LABELS, SHARE_CARD_LAYOUTS } from "./types";

export type BatchShareSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  batch: BatchShareSource;
  studio: StudioShareSource;
};

function ShareControls({
  layout,
  onLayoutChange,
  headline,
  onHeadlineChange,
  cta,
  onCtaChange,
  fieldKeys,
  fields,
  onToggleField,
  compact,
}: {
  layout: ShareCardLayoutId;
  onLayoutChange: (layout: ShareCardLayoutId) => void;
  headline: string;
  onHeadlineChange: (headline: string) => void;
  cta: string;
  onCtaChange: (cta: string) => void;
  fieldKeys: ShareCardFieldKey[];
  fields: ShareCardFieldVisibility;
  onToggleField: (key: ShareCardFieldKey, selected: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.controlsCompact : styles.controls}>
      <div className={styles.controlBlock}>
        <p className={styles.controlLabel}>Layout</p>
        <div className={styles.layoutGrid}>
          {SHARE_CARD_LAYOUTS.map((item) => {
            const selected = layout === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                data-testid={`batch-share-layout-${item.id}`}
                className={styles.layoutChip}
                data-selected={selected ? "true" : undefined}
                onClick={() => onLayoutChange(item.id)}
              >
                <span className={styles.layoutChipTitle}>{item.label}</span>
                <span className={styles.layoutChipMeta}>
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.controlBlock}>
        <Select
          label="Headline"
          selectedKey={headline}
          onSelectionChange={(key) => {
            if (typeof key === "string") {
              onHeadlineChange(key);
            }
          }}
        >
          <SelectTrigger data-testid="batch-share-headline">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHARE_HEADLINES.map((item) => (
              <SelectItem key={item} id={item} textValue={item}>
                {item}
              </SelectItem>
            ))}
            {!SHARE_HEADLINES.includes(
              headline as (typeof SHARE_HEADLINES)[number],
            ) ? (
              <SelectItem key={headline} id={headline} textValue={headline}>
                {headline}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <FormInput
        label="Call to action"
        value={cta}
        onChange={onCtaChange}
        data-testid="batch-share-cta"
      />

      {fieldKeys.length > 0 ? (
        <div className={styles.controlBlock}>
          <p className={styles.controlLabel}>Show on card</p>
          <div className={styles.fieldList}>
            {fieldKeys.map((key) => (
              <Checkbox
                key={key}
                isSelected={fields[key] !== false}
                onChange={(selected) => onToggleField(key, selected)}
                data-testid={`batch-share-field-${key}`}
              >
                {SHARE_CARD_FIELD_LABELS[key]}
              </Checkbox>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BatchShareSheet({
  isOpen,
  onOpenChange,
  batch,
  studio,
}: BatchShareSheetProps) {
  const isMobile = useIsMobile();
  const { toast } = useToastContext("BatchShareSheet");
  const [layout, setLayout] = useState<ShareCardLayoutId>("fullBleed");
  const [headline, setHeadline] = useState(DEFAULT_SHARE_HEADLINE);
  const [cta, setCta] = useState(DEFAULT_SHARE_CTA);
  const [fields, setFields] = useState<ShareCardFieldVisibility>({});
  const [busy, setBusy] = useState(false);

  const seedData = useMemo(
    () => buildBatchShareCardData(batch, studio),
    [batch, studio],
  );

  const fieldKeys = useMemo(() => availableShareFields(seedData), [seedData]);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) {
      return;
    }
    setLayout("fullBleed");
    setHeadline(DEFAULT_SHARE_HEADLINE);
    setCta(DEFAULT_SHARE_CTA);
    setFields(defaultFieldVisibility(seedData));
    setBusy(false);
  }, [isOpen, seedData]);

  const cardData = useMemo(
    () =>
      buildBatchShareCardData(batch, studio, {
        headline,
        cta,
        layout,
        fields,
      }),
    [batch, studio, headline, cta, layout, fields],
  );

  const toggleField = (key: ShareCardFieldKey, selected: boolean) => {
    setFields((prev) => ({ ...prev, [key]: selected }));
  };

  const runExport = async (preferDownload: boolean) => {
    setBusy(true);
    try {
      const result = preferDownload
        ? await downloadShareCard({ data: cardData, layout })
        : await shareOrDownloadShareCard({ data: cardData, layout });

      if (result.mode === "shared") {
        toast({
          title: "Ready to share",
          description: "Pick an app to post your Story card.",
          variant: "success",
        });
      } else if (result.mode === "downloaded") {
        toast({
          title: preferDownload ? "Image downloaded" : "Image saved",
          description: preferDownload
            ? "Open the PNG and share it to Instagram Stories."
            : "Sharing isn’t available here, so the PNG was downloaded instead.",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Could not create image",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <div className={styles.actions}>
      <TouchButton
        variant="primary"
        fullWidth
        isPending={busy}
        data-testid="batch-share-share"
        onClick={() => void runExport(false)}
      >
        Share
      </TouchButton>
      <TouchButton
        variant="quiet"
        fullWidth
        isDisabled={busy}
        data-testid="batch-share-download"
        onClick={() => void runExport(true)}
      >
        Download
      </TouchButton>
    </div>
  );

  const body = (
    <div className={isMobile ? styles.mobileBody : styles.desktopBody}>
      <div className={styles.previewPane}>
        <ShareCardPreview data={cardData} layout={layout} />
      </div>
      <div className={styles.sidePane}>
        <ShareControls
          layout={layout}
          onLayoutChange={setLayout}
          headline={headline}
          onHeadlineChange={setHeadline}
          cta={cta}
          onCtaChange={setCta}
          fieldKeys={fieldKeys}
          fields={fields}
          onToggleField={toggleField}
          compact={isMobile}
        />
        {actions}
      </div>
    </div>
  );

  if (isMobile) {
    if (!isOpen) {
      return null;
    }
    return (
      <div className={styles.mobileShell} data-testid="batch-share-sheet">
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.mobileClose}
            aria-label="Close"
            data-testid="batch-share-close"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" />
          </button>
          <h2 className={styles.mobileTitle}>Share Batch</h2>
          <span className={styles.mobileHeaderSpacer} aria-hidden="true" />
        </header>
        {body}
      </div>
    );
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal className={styles.modal}>
        <DialogContent showCloseButton className={styles.dialogContent}>
          <DialogHeader>
            <DialogTitle>Share Batch</DialogTitle>
          </DialogHeader>
          <DialogBody
            className={styles.dialogBody}
            data-testid="batch-share-sheet"
          >
            {body}
          </DialogBody>
        </DialogContent>
      </Modal>
    </Dialog>
  );
}
