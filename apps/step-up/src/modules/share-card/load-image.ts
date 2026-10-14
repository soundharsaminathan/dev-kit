export function studioMonogram(studioName: string): string {
  const words = studioName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  return studioName.trim().slice(0, 2).toUpperCase() || "SU";
}

export async function loadCorsImage(
  url: string | undefined,
): Promise<HTMLImageElement | null> {
  if (!url) {
    return null;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export type CoverFit = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
};

/** Center-crop source image into a destination rectangle (object-fit: cover). */
export function coverFitRect(
  imageWidth: number,
  imageHeight: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): CoverFit {
  const sourceRatio = imageWidth / imageHeight;
  const destRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = imageWidth;
  let sh = imageHeight;

  if (sourceRatio > destRatio) {
    sw = imageHeight * destRatio;
    sx = (imageWidth - sw) / 2;
  } else {
    sh = imageWidth / destRatio;
    sy = (imageHeight - sh) / 2;
  }

  return { sx, sy, sw, sh, dx, dy, dw, dh };
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const fit = coverFitRect(image.width, image.height, dx, dy, dw, dh);
  ctx.drawImage(
    image,
    fit.sx,
    fit.sy,
    fit.sw,
    fit.sh,
    fit.dx,
    fit.dy,
    fit.dw,
    fit.dh,
  );
}

export function drawMonogram(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  size: number,
  accent: string,
  textColor = "#FFFFFF",
) {
  const radius = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `700 ${Math.round(size * 0.38)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(studioMonogram(label), x + radius, y + radius + 2);
  ctx.restore();
}

export async function waitForFonts() {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading failures; canvas falls back to system fonts.
    }
  }
}
