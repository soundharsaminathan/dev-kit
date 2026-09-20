import { Icon } from "@dev-ui/icons";
import { useRef } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./branding-panel.module.scss";

type BrandingAssetSlotProps = {
  label: string;
  sizeHint: string;
  url?: string | null;
  alt: string;
  variant: "logo" | "mobile" | "desktop";
  uploadLabel: string;
  replaceLabel: string;
  removeLabel?: string;
  uploading?: boolean;
  removing?: boolean;
  onFile: (file: File) => void;
  onRemove?: () => void;
  uploadTestId?: string;
  removeTestId?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function BrandingAssetSlot({
  label,
  sizeHint,
  url,
  alt,
  variant,
  uploadLabel,
  replaceLabel,
  removeLabel = "Remove",
  uploading = false,
  removing = false,
  onFile,
  onRemove,
  uploadTestId,
  removeTestId,
}: BrandingAssetSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

  return (
    <div className={styles.slot}>
      <div className={styles.slotHead}>
        <p className={styles.slotLabel}>{label}</p>
        <p className={styles.assetHint}>{sizeHint}</p>
      </div>

      {url ? (
        <img
          src={url}
          alt={alt}
          className={styles.preview}
          data-variant={variant}
        />
      ) : (
        <button
          type="button"
          className={styles.empty}
          data-variant={variant}
          onClick={pick}
          aria-label={`Add ${label.toLowerCase()} image`}
        >
          <Icon name="image" />
          <span>Upload image</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />

      <div className={styles.actions}>
        <TouchButton
          variant="default"
          size="sm"
          isPending={uploading}
          {...(uploadTestId ? { "data-testid": uploadTestId } : {})}
          onClick={pick}
        >
          {url ? replaceLabel : uploadLabel}
        </TouchButton>
        {url && onRemove ? (
          <TouchButton
            variant="quiet"
            size="sm"
            isPending={removing}
            {...(removeTestId ? { "data-testid": removeTestId } : {})}
            onClick={onRemove}
          >
            {removeLabel}
          </TouchButton>
        ) : null}
      </div>
    </div>
  );
}
