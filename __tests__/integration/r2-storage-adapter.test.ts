import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";

import { R2StorageAdapter } from "@/lib/storage/r2";

const s3Mock = mockClient(S3Client);

const VALID_ENV = {
  R2_ACCOUNT_ID: "test-account",
  R2_ACCESS_KEY_ID: "test-key-id",
  R2_SECRET_ACCESS_KEY: "test-secret",
  R2_BUCKET: "test-bucket",
  R2_PUBLIC_URL: "https://cdn.test.example",
} as const;

function stubValidEnv() {
  for (const [k, v] of Object.entries(VALID_ENV)) {
    vi.stubEnv(k, v);
  }
}

describe("R2StorageAdapter", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("constructor env validation", () => {
    it("throws when R2_ACCOUNT_ID is missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_ACCOUNT_ID", "");
      expect(() => new R2StorageAdapter()).toThrow(/R2_ACCOUNT_ID/);
    });

    it("throws when R2_ACCESS_KEY_ID is missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_ACCESS_KEY_ID", "");
      expect(() => new R2StorageAdapter()).toThrow(/R2_ACCESS_KEY_ID/);
    });

    it("throws when R2_SECRET_ACCESS_KEY is missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
      expect(() => new R2StorageAdapter()).toThrow(/R2_SECRET_ACCESS_KEY/);
    });

    it("throws when R2_BUCKET is missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_BUCKET", "");
      expect(() => new R2StorageAdapter()).toThrow(/R2_BUCKET/);
    });

    it("throws when R2_PUBLIC_URL is missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_PUBLIC_URL", "");
      expect(() => new R2StorageAdapter()).toThrow(/R2_PUBLIC_URL/);
    });

    it("lists every missing var when several are absent", () => {
      stubValidEnv();
      vi.stubEnv("R2_BUCKET", "");
      vi.stubEnv("R2_PUBLIC_URL", "");
      // Both names appear in the same error message.
      expect(() => new R2StorageAdapter()).toThrow(
        /R2_BUCKET.*R2_PUBLIC_URL|R2_PUBLIC_URL.*R2_BUCKET/
      );
    });

    it("treats whitespace-only values as missing", () => {
      stubValidEnv();
      vi.stubEnv("R2_PUBLIC_URL", "   ");
      expect(() => new R2StorageAdapter()).toThrow(/R2_PUBLIC_URL/);
    });
  });

  describe("upload", () => {
    it("sends PutObjectCommand with the configured bucket, key, body, and content type", async () => {
      stubValidEnv();
      s3Mock.on(PutObjectCommand).resolves({});
      const adapter = new R2StorageAdapter();
      const data = Buffer.from("test-bytes");

      await adapter.upload("portfolios/abc/def.webp", data, "image/webp");

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "portfolios/abc/def.webp",
        Body: data,
        ContentType: "image/webp",
      });
    });
  });

  describe("copy", () => {
    it("sends CopyObjectCommand with bucket-prefixed CopySource", async () => {
      stubValidEnv();
      s3Mock.on(CopyObjectCommand).resolves({});
      const adapter = new R2StorageAdapter();

      await adapter.copy(
        "portfolios/abc/def.webp",
        "snapshots/event-1/app-1/def.webp"
      );

      const calls = s3Mock.commandCalls(CopyObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "snapshots/event-1/app-1/def.webp",
        CopySource: "test-bucket/portfolios/abc/def.webp",
      });
    });
  });

  describe("delete", () => {
    it("sends DeleteObjectCommand with the bucket and key", async () => {
      stubValidEnv();
      s3Mock.on(DeleteObjectCommand).resolves({});
      const adapter = new R2StorageAdapter();

      await adapter.delete("portfolios/abc/def.webp");

      const calls = s3Mock.commandCalls(DeleteObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "portfolios/abc/def.webp",
      });
    });

    it("resolves cleanly when the SDK reports the key did not exist", async () => {
      stubValidEnv();
      // R2 contract: DeleteObject succeeds (204) even when the key
      // is missing. Adapter must not surface this as an error.
      s3Mock.on(DeleteObjectCommand).resolves({});
      const adapter = new R2StorageAdapter();

      await expect(
        adapter.delete("portfolios/missing.webp")
      ).resolves.toBeUndefined();
    });
  });

  describe("getUrl", () => {
    it("returns ${R2_PUBLIC_URL}/${key}", () => {
      stubValidEnv();
      const adapter = new R2StorageAdapter();
      expect(adapter.getUrl("portfolios/abc/def.webp")).toBe(
        "https://cdn.test.example/portfolios/abc/def.webp"
      );
    });

    it("normalizes a trailing slash on R2_PUBLIC_URL", () => {
      stubValidEnv();
      vi.stubEnv("R2_PUBLIC_URL", "https://cdn.test.example/");
      const adapter = new R2StorageAdapter();
      expect(adapter.getUrl("portfolios/abc/def.webp")).toBe(
        "https://cdn.test.example/portfolios/abc/def.webp"
      );
    });
  });
});
