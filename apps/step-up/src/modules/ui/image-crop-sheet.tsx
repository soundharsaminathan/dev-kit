import { Slider, SliderControl } from "@dev-ui/components/slider";
import { useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AppSheet } from "./app-sheet";
import styles from "./image-crop-sheet.module.scss";
import { TouchButton } from "./touch-button";

export type ImageCropSheetProps = {
  file: File | null;
  aspect: number;
  cropShape?: "rect" | "round";
  title: string;
  onCancel: () => void;
  onCropDone: (file: File) => void;
  busy?: boolean;
};

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the image."));
    image.src = src;
  });
}

async function cropToFile(src: string, area: Area, originalName: string) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not crop the image.");
  }
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
  if (!blob) {
    throw new Error("Could not crop the image.");
  }

  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function ImageCropSheet({
  file,
  aspect,
  cropShape = "rect",
  title,
  onCancel,
  onCropDone,
  busy,
}: ImageCropSheetProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!src) {
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError(null);
    return () => URL.revokeObjectURL(src);
  }, [src]);

  async function handleDone() {
    if (!file || !src || !croppedArea) {
      return;
    }
    setCropping(true);
    setError(null);
    try {
      onCropDone(await cropToFile(src, croppedArea, file.name));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not crop the image.",
      );
    } finally {
      setCropping(false);
    }
  }

  const pending = cropping || Boolean(busy);

  return (
    <AppSheet
      isOpen={Boolean(file)}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onCancel();
        }
      }}
      title={title}
    >
      <div className={styles.root}>
        <div className={styles.cropArea}>
          {src ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedArea(areaPixels)}
            />
          ) : null}
        </div>

        <div className={styles.zoomRow}>
          <span className={styles.zoomLabel}>Zoom</span>
          <div className={styles.zoomSlider}>
            <Slider
              aria-label="Zoom"
              minValue={1}
              maxValue={4}
              step={0.05}
              value={zoom}
              onChange={(value) =>
                setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)
              }
            >
              <SliderControl />
            </Slider>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <TouchButton variant="quiet" onClick={onCancel} isDisabled={pending}>
            Cancel
          </TouchButton>
          <TouchButton
            variant="primary"
            isPending={pending}
            onClick={() => void handleDone()}
          >
            Use photo
          </TouchButton>
        </div>
      </div>
    </AppSheet>
  );
}
