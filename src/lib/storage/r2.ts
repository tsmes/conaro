import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import type { StorageAdapter } from "./types";

const REQUIRED_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

export class R2StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    // Trim each value so whitespace-only configuration is treated
    // the same as missing — an operator pasting "  " into a Railway
    // variable should fail loud at boot, not silently produce
    // broken CDN URLs at request time.
    const values: Partial<Record<(typeof REQUIRED_ENV_VARS)[number], string>> =
      {};
    const missing: string[] = [];
    for (const name of REQUIRED_ENV_VARS) {
      const trimmed = (process.env[name] ?? "").trim();
      if (trimmed === "") {
        missing.push(name);
      } else {
        values[name] = trimmed;
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `R2 storage misconfigured: missing ${missing.join(", ")}`
      );
    }

    this.bucket = values.R2_BUCKET!;
    // Strip trailing slashes so getUrl() doesn't produce
    // double-slash CDN URLs when an operator copies a value with
    // one or more already present.
    this.publicUrl = values.R2_PUBLIC_URL!.replace(/\/+$/, "");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${values.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: values.R2_ACCESS_KEY_ID!,
        secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async upload(
    key: string,
    data: Buffer,
    contentType: string
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    // S3/R2 does not auto-encode CopySource. Today's keys are
    // UUID-based and contain only path-safe characters, but encoding
    // is cheap defense against future key shapes.
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: toKey,
        CopySource: encodeURI(`${this.bucket}/${fromKey}`),
      })
    );
  }

  async delete(key: string): Promise<void> {
    // R2's DeleteObject is idempotent: succeeds (204) even if the
    // key does not exist. No try/catch needed.
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
