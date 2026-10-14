import { LAYOUT_TOKENS, type ShareCardLayoutTokens } from "./layouts";
import {
  drawCoverImage,
  drawMonogram,
  loadCorsImage,
  waitForFonts,
} from "./load-image";
import type { BatchShareCardData, ShareCardLayoutId } from "./types";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "./types";

export type RenderShareCardInput = {
  data: BatchShareCardData;
  layout: ShareCardLayoutId;
  canvas?: HTMLCanvasElement;
  coverImage?: HTMLImageElement | null;
  logoImage?: HTMLImageElement | null;
};

type MetaLine = { label: string; value: string };

function accentOf(data: BatchShareCardData, tokens: ShareCardLayoutTokens) {
  return data.studioPrimaryColor ?? tokens.defaultAccent;
}

function metaLines(data: BatchShareCardData): MetaLine[] {
  const lines: MetaLine[] = [];
  if (data.danceStyle) {
    lines.push({ label: "Style", value: data.danceStyle });
  }
  if (data.trainerName) {
    lines.push({ label: "Trainer", value: data.trainerName });
  }
  if (data.schedule) {
    lines.push({ label: "When", value: data.schedule });
  }
  if (data.ageGroup) {
    lines.push({ label: "Age", value: data.ageGroup });
  }
  if (data.location) {
    lines.push({ label: "Where", value: data.location });
  }
  return lines;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = words[0]!;

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index]!;
    const next = `${current} ${word}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines) {
    lines.push(current);
  } else {
    const lastIndex = maxLines - 1;
    let last = lines[lastIndex] ?? current;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lastIndex] = `${last}…`;
  }

  // If we broke early mid-word list, ellipsize last line.
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").replace(/…$/, "");
    const remaining = text.trim().slice(consumed.length).trim();
    if (remaining.length > 0 && !lines[maxLines - 1]!.endsWith("…")) {
      let last = lines[maxLines - 1]!;
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }

  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  for (let index = 0; index < lines.length; index += 1) {
    ctx.fillText(lines[index]!, x, y + index * lineHeight);
  }
  return lines.length * lineHeight;
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  tokens: ShareCardLayoutTokens,
) {
  ctx.save();
  ctx.fillStyle = tokens.mutedText;
  ctx.font = `500 22px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("classa", SHARE_CARD_WIDTH / 2, SHARE_CARD_HEIGHT - 40);
  ctx.restore();
}

function drawCta(
  ctx: CanvasRenderingContext2D,
  label: string,
  tokens: ShareCardLayoutTokens,
  accent: string,
  y: number,
) {
  const text = label.trim() || "Join This Batch";
  ctx.font = `700 ${tokens.ctaSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const padX = 48;
  const padY = 28;
  const width = Math.min(
    SHARE_CARD_WIDTH - tokens.paddingX * 2,
    textWidth + padX * 2,
  );
  const height = tokens.ctaSize + padY * 2;
  const x = tokens.paddingX;

  // Hero Band uses accent fill; Full Bleed / Studio Frame use light pill.
  const useAccentFill = tokens.id === "heroBand";
  const pillFill = useAccentFill ? accent : tokens.ctaBg;
  const labelFill = useAccentFill ? "#FFFFFF" : tokens.ctaText;

  ctx.save();
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = pillFill;
  ctx.fill();
  ctx.fillStyle = labelFill;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + height / 2);
  ctx.restore();
  return height;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGradientFallback(
  ctx: CanvasRenderingContext2D,
  accent: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, "#1A1814");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(
    x + w * 0.85,
    y + h * 0.15,
    w * 0.35,
    h * 0.22,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    x + w * 0.1,
    y + h * 0.75,
    w * 0.4,
    h * 0.28,
    0.4,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawLogoOrMonogram(
  ctx: CanvasRenderingContext2D,
  data: BatchShareCardData,
  logo: HTMLImageElement | null | undefined,
  x: number,
  y: number,
  size: number,
  accent: string,
) {
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCoverImage(ctx, logo, x, y, size, size);
    ctx.restore();
    return;
  }
  drawMonogram(ctx, data.studioName, x, y, size, accent);
}

function drawMetaBlock(
  ctx: CanvasRenderingContext2D,
  data: BatchShareCardData,
  tokens: ShareCardLayoutTokens,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const lines = metaLines(data);
  if (lines.length === 0) {
    return 0;
  }

  let cursor = y;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (const line of lines) {
    ctx.fillStyle = tokens.mutedText;
    ctx.font = `600 ${Math.round(tokens.metaSize * 0.72)}px Inter, system-ui, sans-serif`;
    ctx.fillText(line.label.toUpperCase(), x, cursor);
    cursor += tokens.metaSize * 0.85;
    ctx.fillStyle = tokens.text;
    ctx.font = `600 ${tokens.metaSize}px Inter, system-ui, sans-serif`;
    cursor += drawWrappedText(
      ctx,
      line.value,
      x,
      cursor,
      maxWidth,
      tokens.metaSize * 1.25,
      2,
    );
    cursor += 18;
  }
  return cursor - y;
}

function renderFullBleed(
  ctx: CanvasRenderingContext2D,
  data: BatchShareCardData,
  tokens: ShareCardLayoutTokens,
  cover: HTMLImageElement | null | undefined,
  logo: HTMLImageElement | null | undefined,
) {
  const accent = accentOf(data, tokens);
  if (cover) {
    drawCoverImage(ctx, cover, 0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  } else {
    drawGradientFallback(
      ctx,
      accent,
      0,
      0,
      SHARE_CARD_WIDTH,
      SHARE_CARD_HEIGHT,
    );
  }

  const scrim = ctx.createLinearGradient(0, 0, 0, SHARE_CARD_HEIGHT);
  scrim.addColorStop(0, "rgba(0,0,0,0.35)");
  scrim.addColorStop(0.45, "rgba(0,0,0,0.25)");
  scrim.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  const x = tokens.paddingX;
  let y = tokens.paddingTop;
  drawLogoOrMonogram(ctx, data, logo, x, y, tokens.logoSize, accent);
  y += tokens.logoSize + 28;

  ctx.fillStyle = tokens.mutedText;
  ctx.font = `600 ${tokens.studioNameSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  y += drawWrappedText(
    ctx,
    data.studioName,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.studioNameSize * 1.2,
    1,
  );
  y += 48;

  ctx.fillStyle = accent;
  ctx.font = `800 ${tokens.headlineSize}px Inter, system-ui, sans-serif`;
  y += drawWrappedText(
    ctx,
    data.headline,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.headlineSize * 1.05,
    3,
  );
  y += 28;

  ctx.fillStyle = tokens.text;
  ctx.font = `700 ${tokens.batchNameSize}px Inter, system-ui, sans-serif`;
  y += drawWrappedText(
    ctx,
    data.batchName,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.batchNameSize * 1.1,
    3,
  );

  const metaHeight = estimateMetaHeight(metaLines(data), tokens);
  const ctaY = SHARE_CARD_HEIGHT - tokens.paddingBottom - 110 - metaHeight;
  drawMetaBlock(
    ctx,
    data,
    tokens,
    x,
    Math.max(y + 48, ctaY - metaHeight - 24),
    SHARE_CARD_WIDTH - x * 2,
  );
  if (data.cta) {
    drawCta(
      ctx,
      data.cta,
      tokens,
      accent,
      SHARE_CARD_HEIGHT - tokens.paddingBottom - 100,
    );
  }
  drawFooter(ctx, tokens);
}

function estimateMetaHeight(lines: MetaLine[], tokens: ShareCardLayoutTokens) {
  if (lines.length === 0) {
    return 0;
  }
  return lines.length * (tokens.metaSize * 2.2 + 18);
}

function renderHeroBand(
  ctx: CanvasRenderingContext2D,
  data: BatchShareCardData,
  tokens: ShareCardLayoutTokens,
  cover: HTMLImageElement | null | undefined,
  logo: HTMLImageElement | null | undefined,
) {
  const accent = accentOf(data, tokens);
  const heroHeight = Math.round(SHARE_CARD_HEIGHT * tokens.heroRatio);

  if (cover) {
    drawCoverImage(ctx, cover, 0, 0, SHARE_CARD_WIDTH, heroHeight);
  } else {
    drawGradientFallback(ctx, accent, 0, 0, SHARE_CARD_WIDTH, heroHeight);
  }

  ctx.fillStyle = tokens.background;
  ctx.fillRect(0, heroHeight, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT - heroHeight);

  // Soft fade into content panel.
  const fade = ctx.createLinearGradient(0, heroHeight - 80, 0, heroHeight + 1);
  fade.addColorStop(0, "rgba(247,243,236,0)");
  fade.addColorStop(1, tokens.background);
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroHeight - 80, SHARE_CARD_WIDTH, 81);

  const x = tokens.paddingX;
  let y = heroHeight + 48;

  drawLogoOrMonogram(ctx, data, logo, x, y, tokens.logoSize, accent);
  ctx.fillStyle = tokens.text;
  ctx.font = `700 ${tokens.studioNameSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    data.studioName,
    x + tokens.logoSize + 24,
    y + tokens.logoSize / 2,
    SHARE_CARD_WIDTH - x * 2 - tokens.logoSize - 24,
  );
  y += tokens.logoSize + 40;

  ctx.fillStyle = accent;
  ctx.font = `800 ${tokens.headlineSize}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  y += drawWrappedText(
    ctx,
    data.headline,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.headlineSize * 1.08,
    2,
  );
  y += 20;

  ctx.fillStyle = tokens.text;
  ctx.font = `700 ${tokens.batchNameSize}px Inter, system-ui, sans-serif`;
  y += drawWrappedText(
    ctx,
    data.batchName,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.batchNameSize * 1.1,
    3,
  );
  y += 36;
  y += drawMetaBlock(ctx, data, tokens, x, y, SHARE_CARD_WIDTH - x * 2);

  if (data.cta) {
    drawCta(
      ctx,
      data.cta,
      tokens,
      accent,
      Math.min(y + 24, SHARE_CARD_HEIGHT - tokens.paddingBottom - 100),
    );
  }
  drawFooter(ctx, tokens);
}

function renderStudioFrame(
  ctx: CanvasRenderingContext2D,
  data: BatchShareCardData,
  tokens: ShareCardLayoutTokens,
  cover: HTMLImageElement | null | undefined,
  logo: HTMLImageElement | null | undefined,
) {
  const accent = accentOf(data, tokens);
  ctx.fillStyle = tokens.background;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  // Decorative corner accents.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, 420, 320, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT, 480, 360, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const x = tokens.paddingX;
  let y = tokens.paddingTop;

  drawLogoOrMonogram(ctx, data, logo, x, y, tokens.logoSize, accent);
  y += tokens.logoSize + 28;
  ctx.fillStyle = tokens.text;
  ctx.font = `700 ${tokens.studioNameSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  y += drawWrappedText(
    ctx,
    data.studioName,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.studioNameSize * 1.2,
    2,
  );
  y += 36;

  ctx.fillStyle = accent;
  ctx.font = `700 ${tokens.headlineSize}px Inter, system-ui, sans-serif`;
  y += drawWrappedText(
    ctx,
    data.headline,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.headlineSize * 1.1,
    2,
  );
  y += 32;

  const frameX = tokens.frameInset;
  const frameW = SHARE_CARD_WIDTH - tokens.frameInset * 2;
  const frameH = Math.round(SHARE_CARD_HEIGHT * tokens.heroRatio);
  roundRect(ctx, frameX, y, frameW, frameH, 36);
  ctx.save();
  ctx.clip();
  if (cover) {
    drawCoverImage(ctx, cover, frameX, y, frameW, frameH);
  } else {
    drawGradientFallback(ctx, accent, frameX, y, frameW, frameH);
    drawMonogram(
      ctx,
      data.batchName,
      frameX + frameW / 2 - 64,
      y + frameH / 2 - 64,
      128,
      "rgba(255,255,255,0.2)",
      "#FFFFFF",
    );
  }
  ctx.restore();

  // Frame border.
  roundRect(ctx, frameX, y, frameW, frameH, 36);
  ctx.strokeStyle = "rgba(248,244,236,0.28)";
  ctx.lineWidth = 3;
  ctx.stroke();
  y += frameH + 40;

  ctx.fillStyle = tokens.text;
  ctx.font = `700 ${tokens.batchNameSize}px Inter, system-ui, sans-serif`;
  y += drawWrappedText(
    ctx,
    data.batchName,
    x,
    y,
    SHARE_CARD_WIDTH - x * 2,
    tokens.batchNameSize * 1.1,
    3,
  );
  y += 28;
  y += drawMetaBlock(ctx, data, tokens, x, y, SHARE_CARD_WIDTH - x * 2);

  if (data.cta) {
    drawCta(
      ctx,
      data.cta,
      tokens,
      accent,
      Math.min(y + 20, SHARE_CARD_HEIGHT - tokens.paddingBottom - 100),
    );
  }
  drawFooter(ctx, tokens);
}

export async function renderShareCard(
  input: RenderShareCardInput,
): Promise<HTMLCanvasElement> {
  await waitForFonts();

  const canvas = input.canvas ?? document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create a canvas for the share card.");
  }

  const tokens = LAYOUT_TOKENS[input.layout];
  const [cover, logo] = await Promise.all([
    input.coverImage !== undefined
      ? Promise.resolve(input.coverImage)
      : loadCorsImage(input.data.coverImageUrl),
    input.logoImage !== undefined
      ? Promise.resolve(input.logoImage)
      : loadCorsImage(input.data.studioLogoUrl),
  ]);

  ctx.clearRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  if (input.layout === "fullBleed") {
    renderFullBleed(ctx, input.data, tokens, cover, logo);
  } else if (input.layout === "heroBand") {
    renderHeroBand(ctx, input.data, tokens, cover, logo);
  } else {
    renderStudioFrame(ctx, input.data, tokens, cover, logo);
  }

  return canvas;
}
