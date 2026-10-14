import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALLOWED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILENAME_LENGTH = 120;
const READ_URL_EXPIRES_SECONDS = 60 * 60 * 6;

@Injectable()
export class MediaService {
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("R2_BUCKET") ?? "loan-mate-media";

    const accountId = this.config.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = this.config.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("R2_SECRET_ACCESS_KEY");

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
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

  private assertAllowedContentType(contentType: string) {
    if (!ALLOWED_DOCUMENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        "Documents must be JPEG, PNG, WebP, or PDF",
      );
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  async signReadUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) return null;
    if (!this.client) {
      return `https://example.local/download/${encodeURIComponent(value)}`;
    }
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: value }),
        { expiresIn: READ_URL_EXPIRES_SECONDS },
      );
    } catch {
      return value;
    }
  }

  async createSignedUploadUrl(filename: string, contentType: string) {
    const normalizedType = this.normalizeContentType(contentType);
    this.assertAllowedContentType(normalizedType);
    const key = `documents/${randomUUID()}-${this.sanitizeFilename(filename)}`;

    if (!this.client) {
      const uploadUrl = `https://example.local/upload/${encodeURIComponent(key)}`;
      return {
        uploadUrl,
        publicUrl: key,
        key,
        bucket: this.bucket,
        contentType: normalizedType,
        expiresIn: 900,
        headers: { "Content-Type": normalizedType },
        provider: "dev-stub",
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: normalizedType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 900,
    });

    return {
      uploadUrl,
      publicUrl: key,
      key,
      bucket: this.bucket,
      contentType: normalizedType,
      expiresIn: 900,
      headers: { "Content-Type": normalizedType },
      provider: "r2",
    };
  }
}
