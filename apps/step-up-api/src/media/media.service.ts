import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_BRANCH_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

const ALLOWED_CHAT_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
]);

const ALLOWED_RECEIPT_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
]);

const MEDIA_FOLDERS = [
  "avatars",
  "studio-logos",
  "studio-heroes",
  "posts",
  "chat",
  "batches",
  "certificates",
  "expense-receipts",
  "uploads",
] as const;
const MAX_FILENAME_LENGTH = 120;
const READ_URL_EXPIRES_SECONDS = 60 * 60 * 6;

export type MediaPurpose =
  | "branch"
  | "avatar"
  | "studio-logo"
  | "studio-hero"
  | "post"
  | "chat"
  | "batch"
  | "certificate"
  | "expense-receipt";

@Injectable()
export class MediaService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const read = (key: string) =>
      this.config.get<string>(key) ?? process.env[key] ?? undefined;

    this.bucket = read("R2_BUCKET") ?? "step-up-media";
    this.publicUrl = (read("R2_PUBLIC_URL") ?? "").replace(/\/$/, "");

    const accountId = read("R2_ACCOUNT_ID");
    const accessKeyId = read("R2_ACCESS_KEY_ID");
    const secretAccessKey = read("R2_SECRET_ACCESS_KEY");

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // R2-incompatible default CRC32 signing on PutObject presigned URLs.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
    } else {
      this.client = null;
    }
  }

  private sanitizeFilename(filename: string) {
    const base = filename.split(/[/\\]/).pop()?.trim() || "upload";
    const cleaned = base
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, MAX_FILENAME_LENGTH);
    return cleaned || "upload";
  }

  private normalizeContentType(contentType: string) {
    return contentType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  }

  private assertAllowedContentType(contentType: string, purpose: MediaPurpose) {
    if (ALLOWED_IMAGE_TYPES.has(contentType)) {
      return;
    }
    if (
      purpose === "expense-receipt" &&
      ALLOWED_RECEIPT_TYPES.has(contentType)
    ) {
      return;
    }
    if (purpose === "branch" && ALLOWED_BRANCH_VIDEO_TYPES.has(contentType)) {
      return;
    }
    if (purpose === "chat" && ALLOWED_CHAT_AUDIO_TYPES.has(contentType)) {
      return;
    }
    if (purpose === "chat") {
      throw new BadRequestException(
        "Chat uploads must be JPEG, PNG, WebP, GIF, or audio (WebM, MP4, MPEG, OGG, WAV, M4A, AAC)",
      );
    }
    if (purpose === "branch") {
      throw new BadRequestException(
        "Branch uploads must be JPEG, PNG, WebP, GIF, MP4, or WebM",
      );
    }
    if (purpose === "expense-receipt") {
      throw new BadRequestException(
        "Expense receipts must be JPEG, PNG, WebP, GIF, or PDF",
      );
    }
    throw new BadRequestException(
      "Only JPEG, PNG, WebP, and GIF images can be uploaded",
    );
  }

  private assertConfigured() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Media storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
      );
    }
    return this.client;
  }

  private looksLikeObjectKey(value: string) {
    return MEDIA_FOLDERS.some((folder) => value.startsWith(`${folder}/`));
  }

  /** Resolve a persisted key or legacy absolute URL to an R2 object key. */
  resolveObjectKey(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (this.looksLikeObjectKey(trimmed)) {
      return trimmed;
    }

    if (this.publicUrl && trimmed.startsWith(`${this.publicUrl}/`)) {
      const key = trimmed.slice(this.publicUrl.length + 1).split("?")[0];
      return key || null;
    }

    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/^\//, "");
      if (!path) {
        return null;
      }

      if (url.hostname.endsWith(".r2.cloudflarestorage.com")) {
        const hostBucket = url.hostname.split(".")[0] ?? "";
        if (hostBucket === this.bucket) {
          return path;
        }
        if (path.startsWith(`${this.bucket}/`)) {
          return path.slice(this.bucket.length + 1) || null;
        }
        if (this.looksLikeObjectKey(path)) {
          return path;
        }
      }

      if (this.looksLikeObjectKey(path)) {
        return path;
      }
    } catch {
      return null;
    }

    return null;
  }

  private publicReadUrl(key: string): string | null {
    if (!this.publicUrl) {
      return null;
    }
    return `${this.publicUrl}/${key}`;
  }

  async signReadUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) {
      return null;
    }
    const key = this.resolveObjectKey(value);
    if (!key) {
      // Already an absolute URL (or unknown opaque value) — pass through.
      return value;
    }

    if (this.client) {
      try {
        return await getSignedUrl(
          this.client,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
          { expiresIn: READ_URL_EXPIRES_SECONDS },
        );
      } catch {
        // Fall through to public CDN / null — never return a relative object key.
      }
    }

    // Auth/bootstrap must not fail when object storage is misconfigured.
    // Prefer the public CDN base over a bare key (browsers treat keys as site-relative).
    return this.publicReadUrl(key);
  }

  async signReadUrls(values: string[]): Promise<string[]> {
    const signed = await Promise.all(
      values.map((value) => this.signReadUrl(value)),
    );
    // Drop unresolvable object keys — never emit site-relative storage paths.
    return signed.filter((value): value is string => Boolean(value));
  }

  async createSignedUploadUrl(
    filename: string,
    contentType: string,
    purpose: MediaPurpose = "branch",
  ) {
    const normalizedType = this.normalizeContentType(contentType);
    this.assertAllowedContentType(normalizedType, purpose);
    const client = this.assertConfigured();

    const folder =
      purpose === "avatar"
        ? "avatars"
        : purpose === "studio-logo"
          ? "studio-logos"
          : purpose === "studio-hero"
            ? "studio-heroes"
            : purpose === "post"
              ? "posts"
              : purpose === "chat"
                ? "chat"
                : purpose === "batch"
                  ? "batches"
                  : purpose === "certificate"
                    ? "certificates"
                    : purpose === "expense-receipt"
                      ? "expense-receipts"
                      : "uploads";
    const key = `${folder}/${randomUUID()}-${this.sanitizeFilename(filename)}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: normalizedType,
    });
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 900,
    });

    return {
      uploadUrl,
      // Persist this key in the DB. Clients receive signed GET URLs on read.
      publicUrl: key,
      key,
      bucket: this.bucket,
      contentType: normalizedType,
      expiresIn: 900,
      headers: {
        "Content-Type": normalizedType,
      },
      provider: "r2",
    };
  }
}
